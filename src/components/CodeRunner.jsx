import { CloseOutlined, CodeOutlined, DownloadOutlined, EyeOutlined, FileOutlined, FolderOutlined } from '@ant-design/icons';
import { Button, Space, Tree } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import MonacoEditor from './MonacoEditor';

// 与 Markdown.jsx 中 RUNNABLE_LANGS 保持一致
const LANG_MAP = {
    html: 'html',
    xml: 'html',
    svg: 'html',
    css: 'css',
    js: 'javascript',
    jsx: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    typescript: 'typescript',
    vue: 'html',
    json: 'json'
};

// 单文件下载时的扩展名
const EXT_MAP = {
    html: 'html',
    xml: 'html',
    svg: 'svg',
    css: 'css',
    js: 'js',
    jsx: 'jsx',
    javascript: 'js',
    ts: 'ts',
    tsx: 'tsx',
    typescript: 'ts',
    vue: 'vue',
    json: 'json'
};

// iframe 内注入错误捕获, 把 JS 报错显示在预览页顶部
const ERROR_GUARD = `<script>
window.addEventListener('error', (e) => {
    const el = document.getElementById('__error__') || (() => {
        const d = document.createElement('div');
        d.id = '__error__';
        d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#fff1f0;color:#cf1322;padding:8px 12px;font:12px/1.5 monospace;border-bottom:1px solid #ffa39e;white-space:pre-wrap;';
        (document.body || document.documentElement).appendChild(d);
        return d;
    })();
    el.textContent = 'Error: ' + e.message;
});
</script>`;

// 相对路径(虚拟文件)走 VFS 解析; CDN/绝对地址/data: 原样保留交给浏览器加载
const isLocalRef = url => !/^(?:[a-z]+:)?\/\//i.test(url) && !/^data:/i.test(url);

/**
 * 把模型生成的文件集组装成可预览的完整 HTML。
 * 只处理 <link rel="stylesheet"> 与 <script src> 两种引用:
 * 相对路径在文件集中模糊匹配后内联, 外链(CDN 等)原样保留。
 */
const buildHtml = files => {
    const isHtml = f => ['html', 'xml', 'svg'].includes(f.lang);
    const htmlFile = files.find(isHtml) || files[0];

    // 兜底: 没有任何 html 文件时(理论上不会发生, 运行按钮只在 html 块上), 包一层完整模板
    if (!isHtml(htmlFile)) {
        const style = htmlFile.lang === 'css' ? `<style>\n${htmlFile.code}\n</style>` : '';
        const script = htmlFile.lang === 'css' ? '' : `<script>\n${htmlFile.code}\n</script>`;
        return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>预览</title>
${style}
</head>
<body>
${script}
${ERROR_GUARD}
</body>
</html>`;
    }

    // 模糊匹配: 先按完整文件名, 再按 basename(忽略路径), 最后按语言 (js/javascript 等视为等价)
    const normLang = l => (l === 'javascript' ? 'js' : l === 'typescript' ? 'ts' : l);
    const findFile = (href, lang) => {
        let f = files.find(x => x.name === href);
        if (f) {
            return f;
        }
        const base = href.split('/').pop();
        f = files.find(x => x.name.split('/').pop() === base);
        if (f) {
            return f;
        }
        return files.find(x => normLang(x.lang) === normLang(lang)) || null;
    };

    let html = htmlFile.code;

    // <link rel="stylesheet" href="..."> -> <style>...</style>
    html = html.replace(/<link\b[^>]*>/gi, tag => {
        const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
        if (!href || !/stylesheet/i.test(tag) || !isLocalRef(href)) {
            return tag;
        }
        const f = findFile(href, 'css');
        return f ? `<style>${f.code}</style>` : tag;
    });

    // <script src="..."></script> -> <script>...</script>
    html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (tag, src) => {
        if (!isLocalRef(src)) {
            return tag;
        }
        const f = findFile(src, 'js');
        return f ? `<script>${f.code}</script>` : tag;
    });

    return html;
};

// 把文件列表按 name 的 / 分段构建成 antd Tree 数据, 同目录归并到同一文件夹节点
const buildTreeData = files => {
    const root = [];
    for (const item of files) {
        const parts = item.name.split('/');
        let level = root;
        let keyPath = '';
        parts.forEach((part, index) => {
            keyPath = keyPath ? `${keyPath}/${part}` : part;
            const isFile = index === parts.length - 1;
            let node = level.find(item1 => item1.key === keyPath);
            if (!node) {
                node = isFile
                    ? { key: keyPath, title: part, isLeaf: true, icon: <FileOutlined /> }
                    : { key: keyPath, title: part, icon: <FolderOutlined />, children: [] };
                level.push(node);
            }
            level = node.children || (node.children = []);
        });
    }
    return root;
};

// 预览窗口宽度限制 (拖拽调整, 记忆上次宽度)
const RUNNER_MIN = 320;
const RUNNER_DEFAULT = 480;
const clampRunnerWidth = w => Math.min(Math.max(w, RUNNER_MIN), Math.floor(window.innerWidth * 0.8));

const CodeRunner = ({ runner, onClose }) => {
    const [tab, setTab] = useState('preview'); // preview | source
    const [files, setFiles] = useState([]);
    const [active, setActive] = useState(0);
    const [panelWidth, setPanelWidth] = useState(() => {
        const saved = Number(localStorage.getItem('runner-panel-width'));
        return saved >= RUNNER_MIN ? clampRunnerWidth(saved) : RUNNER_DEFAULT;
    });
    const editorApiRef = useRef(null); // Monaco 的 { getValue }
    const panelWidthRef = useRef(panelWidth);
    panelWidthRef.current = panelWidth;

    // 左边缘拖拽调整窗口宽度
    const startDrag = e => {
        e.preventDefault();
        document.body.style.userSelect = 'none';
        const move = ev => setPanelWidth(clampRunnerWidth(window.innerWidth - ev.clientX));
        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            document.body.style.userSelect = '';
            localStorage.setItem('runner-panel-width', String(panelWidthRef.current));
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    // 每次打开时重置
    useEffect(() => {
        if (runner) {
            setTab('preview');
            setFiles(runner.files.map(f => ({ ...f })));
            setActive(0);
        }
    }, [runner]);

    const activeFile = files[active];
    const lang = activeFile ? LANG_MAP[activeFile.lang] || 'html' : 'html';

    const showPreview = () => {
        // 切换前确保编辑器实时内容已回写进 files (onChange 已同步, 这里只是兜底)
        const val = editorApiRef.current?.getValue();
        if (val !== undefined) {
            setFiles(prev => prev.map((f, i) => (i === active ? { ...f, code: val } : f)));
        }
        setTab('preview');
    };

    const switchFile = i => {
        if (i === active) {
            return;
        }
        const val = editorApiRef.current?.getValue();
        if (val !== undefined) {
            setFiles(prev => prev.map((f, idx) => (idx === active ? { ...f, code: val } : f)));
        }
        setActive(i);
    };

    // 下载当前源码: 多文件下载内联完成的完整页面(单文件即可独立打开), 单文件维持原样
    const download = () => {
        let content;
        let name;
        if (files.length === 1) {
            content = files[0].code;
            name = `index.${EXT_MAP[files[0].lang] || 'txt'}`;
        } else {
            content = buildHtml(files);
            name = 'index.html';
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    };

    const html = useMemo(() => (files.length ? buildHtml(files) : ''), [files]);

    const treeData = useMemo(() => buildTreeData(files), [files]);
    // 是否存在子目录: 平铺文件时隐藏叶节点占位, 去掉多余的左侧缩进
    const hasFolders = useMemo(() => files.some(item => item.name.includes('/')), [files]);
    const activeName = files[active]?.name;

    if (!runner) {
        return null;
    }

    return (
        <aside
            className="relative flex h-full flex-shrink-0 flex-col border-l border-[#e5e6eb] bg-white [animation:runner-slide_0.25s_ease]"
            style={{ width: panelWidth }}
        >
            <div
                className="absolute -left-1 top-0 z-10 h-full w-2 cursor-col-resize transition-colors hover:bg-[rgba(114,46,209,0.12)]"
                onMouseDown={startDrag}
                title="拖拽调整窗口宽度"
            />
            <header className="flex flex-shrink-0 items-center gap-2 px-4 py-3">
                <Space size={8} align="center" className="text-[15px] font-semibold text-[#1f2329]">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    代码运行
                    <span className="rounded-[10px] bg-[rgba(114,46,209,0.08)] px-2 py-0.5 text-xs font-medium text-[#722ed1]">{files.length} 个文件</span>
                </Space>
                <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={onClose}
                    title="关闭"
                    className="ml-auto! h-8! w-8! text-[#8a9099]! hover:text-[#1f2329]!"
                />
            </header>

            <div className="flex min-h-0 flex-1">
                {/* 文件树 (仅源码模式展示, 多文件项目时, 文件夹可折叠) */}
                {tab === 'source' && files.length > 1 && (
                    <div className="w-[190px] flex-shrink-0 overflow-y-auto border-r border-[#eceef1] p-3">
                        <div className="pb-2 text-xs font-semibold text-[#8a9099]">文件</div>
                        <Tree
                            treeData={treeData}
                            selectedKeys={activeName ? [activeName] : []}
                            className={hasFolders ? '' : '[&_.ant-tree-switcher]:hidden'}
                            onSelect={keys => {
                                if (keys.length) {
                                    const index = files.findIndex(item => item.name === keys[0]);
                                    if (index >= 0) {
                                        switchFile(index);
                                    }
                                }
                            }}
                            blockNode
                        />
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-shrink-0 items-center justify-between border-b border-[#eceef1] px-4 py-2">
                        <div className="flex gap-1 rounded-[10px] bg-[#f2f3f5] p-[3px]">
                            <Button
                                type="text"
                                icon={<EyeOutlined />}
                                onClick={showPreview}
                                className={`h-[28px]! rounded-lg! px-3.5! text-[13px]! text-[#646a73]! ${
                                    tab === 'preview' ? 'bg-white! font-semibold! text-[#722ed1]! shadow-[0_1px_4px_rgba(15,20,30,0.08)]' : ''
                                }`}
                            >
                                预览
                            </Button>
                            <Button
                                type="text"
                                icon={<CodeOutlined />}
                                onClick={() => setTab('source')}
                                className={`h-[28px]! rounded-lg! px-3.5! text-[13px]! text-[#646a73]! ${
                                    tab === 'source' ? 'bg-white! font-semibold! text-[#722ed1]! shadow-[0_1px_4px_rgba(15,20,30,0.08)]' : ''
                                }`}
                            >
                                源码
                            </Button>
                        </div>
                        <Button
                            type="text"
                            icon={<DownloadOutlined />}
                            onClick={download}
                            title="下载"
                            className="text-[13px]! text-[#646a73]! hover:bg-transparent! hover:text-[#722ed1]!"
                        >
                            下载
                        </Button>
                    </div>

                    <div className="min-h-0 flex-1">
                        {tab === 'preview' ? (
                            <div className="h-full">
                                {/* key 绑定 html: 源码一变, 预览 iframe 强制重挂载, 切换到预览即看到最新效果 */}
                                <iframe key={html} srcDoc={html} sandbox="allow-scripts" title="代码预览" className="h-full w-full border-0 bg-white" />
                            </div>
                        ) : (
                            <div className="h-full p-2">
                                <MonacoEditor
                                    ref={editorApiRef}
                                    value={activeFile?.code ?? ''}
                                    language={lang}
                                    onChange={code => setFiles(prev => prev.map((f, i) => (i === active ? { ...f, code } : f)))}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default CodeRunner;
