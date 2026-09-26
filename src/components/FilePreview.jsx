import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useRef, useState } from 'react';
import { extOf, formatSize, getFileMeta } from '../utils/fileMeta';
import MonacoEditor from './MonacoEditor';

// 扩展名 → Monaco 语言
const LANG_OF = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    mts: 'typescript',
    cts: 'typescript',
    tsx: 'typescript',
    dts: 'typescript',
    vue: 'html',
    svelte: 'html',
    html: 'html',
    htm: 'html',
    css: 'css',
    less: 'less',
    scss: 'scss',
    sass: 'scss',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'ini',
    ini: 'ini',
    xml: 'xml',
    svg: 'xml',
    md: 'markdown',
    markdown: 'markdown',
    txt: 'plaintext',
    log: 'plaintext',
    py: 'python',
    java: 'java',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    dart: 'dart',
    scala: 'scala',
    sql: 'sql',
    graphql: 'graphql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    bat: 'bat',
    ps1: 'powershell'
};

// 预览窗口宽度限制 (拖拽调整, 记忆上次宽度)
const PREVIEW_MIN = 320;
const PREVIEW_DEFAULT = 520;
const clampPreviewWidth = w => Math.min(Math.max(w, PREVIEW_MIN), Math.floor(window.innerWidth * 0.8));

// 纯文件代码预览: 标题栏 + 只读编辑器, 无运行/下载/模式切换
const FilePreview = ({ file, onClose }) => {
    const [panelWidth, setPanelWidth] = useState(() => {
        const saved = Number(localStorage.getItem('file-preview-width'));
        return saved >= PREVIEW_MIN ? clampPreviewWidth(saved) : PREVIEW_DEFAULT;
    });
    const panelWidthRef = useRef(panelWidth);
    panelWidthRef.current = panelWidth;

    // 左边缘拖拽调整窗口宽度
    const startDrag = e => {
        e.preventDefault();
        document.body.style.userSelect = 'none';
        const move = ev => setPanelWidth(clampPreviewWidth(window.innerWidth - ev.clientX));
        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            document.body.style.userSelect = '';
            localStorage.setItem('file-preview-width', String(panelWidthRef.current));
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    if (!file) {
        return null;
    }
    const meta = getFileMeta(file.name);
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
            <header className="flex flex-shrink-0 items-center gap-3 border-b border-[#eceef1] px-4 py-3">
                <img src={meta.icon} alt="" className="h-6 w-6 flex-shrink-0" />
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-semibold text-[#1f2329]">{file.name}</span>
                    <span className="text-xs text-[#8a9099]">
                        {meta.type} · {formatSize(file.size)}
                    </span>
                </div>
                <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={onClose}
                    title="关闭"
                    className="ml-auto! h-8! w-8! text-[#8a9099]! hover:text-[#1f2329]!"
                />
            </header>
            <div className="min-h-0 flex-1 p-2">
                <MonacoEditor value={file.content} language={LANG_OF[extOf(file.name)] || 'plaintext'} readOnly />
            </div>
        </aside>
    );
};

export default FilePreview;
