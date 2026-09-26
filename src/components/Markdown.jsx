import { PlayCircleOutlined } from '@ant-design/icons';
import 'highlight.js/styles/github.css';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useRunner } from '../runnerContext';
import MonacoEditor from './MonacoEditor';

// 支持运行的语言: 仅限本身可独立渲染成完整页面的文档
const RUNNABLE_LANGS = ['html', 'xml', 'svg'];

// 语言 -> Monaco 内部语言标识
const MONACO_LANG = {
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
    json: 'json'
};

// 提供给各代码块注册自身, 点击运行时把同一 Markdown 里的所有代码块归组成一个项目
const BlocksContext = createContext(null);

// 无文件名标注时的默认文件名(同名时追加序号去重)
const DEFAULT_NAMES = {
    html: 'index.html',
    xml: 'index.html',
    svg: 'index.svg',
    css: 'style.css',
    js: 'script.js',
    jsx: 'script.jsx',
    javascript: 'script.js',
    ts: 'script.ts',
    tsx: 'script.tsx',
    typescript: 'script.ts',
    json: 'data.json'
};

// 代码块高度: 按行数估算, 超高内部滚动
const blockHeight = (text, max = 420) => {
    const lines = (text.match(/\n/g)?.length || 0) + 1;
    return Math.min(Math.max(lines * 20 + 16, 56), max);
};

// 从 hast 节点树提取纯文本 (rehype-highlight 后 children 是高亮 span 树, 不能直接 String)
const nodeText = node => {
    if (!node) {
        return '';
    }
    if (node.type === 'text') {
        return node.value;
    }
    return (node.children || []).map(nodeText).join('');
};

const CodeBlock = ({ className, children, node, streaming, ...rest }) => {
    const [copied, setCopied] = useState(false);
    const { openRunner } = useRunner();
    const blocks = useContext(BlocksContext);
    const lang = /language-([\w-]+)/.exec(className || '')?.[1] || '';
    // "```语言:文件名" 的文件名标注, 未标注时为 null (回退 DEFAULT_NAMES)
    const fileName = /language-[\w-]+:([^\s`]+)/.exec(className || '')?.[1] || null;
    const code = (node ? nodeText(node) : String(children ?? '')).trimEnd(); // fenced code 尾部换行会让 Monaco 多渲染一个空行
    const codeRef = useRef(code);
    codeRef.current = code; // 流式输出时内容持续变化, 供运行按钮读取最新值

    // react-markdown v9 不再传 inline prop, 带 language-* 类名的是块级代码,
    // 否则 (如段落内的 `code`) 按行内渲染, 避免 div/pre 嵌套进 <p>
    if (!lang) {
        return (
            <code className="rounded bg-[rgba(15,20,30,0.06)] px-1.5 py-0.5 font-mono text-[13px] text-[#d63384]" {...rest}>
                {children}
            </code>
        );
    }

    // 挂载时注册到所属 Markdown 的代码块集合, 供"运行"按钮收集整个项目
    useEffect(() => {
        if (!blocks) {
            return;
        }
        return blocks.register({ lang, name: fileName, getText: () => codeRef.current });
    }, []);

    const runnable = RUNNABLE_LANGS.includes(lang);

    // 收集当前 Markdown 内全部代码块组成项目文件列表, 未标注文件名的用默认名(同名去重)
    const run = () => {
        if (!blocks) {
            return;
        }
        const used = new Set();
        const files = blocks.collect().map(item => {
            let name = item.name || DEFAULT_NAMES[item.lang] || `${item.lang}.txt`;
            if (used.has(name)) {
                const dot = name.lastIndexOf('.');
                name = `${name.slice(0, dot)}-${used.size}${name.slice(dot)}`;
            }
            used.add(name);
            return { name, lang: item.lang, code: item.getText() };
        });
        openRunner(files);
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="mb-3 overflow-hidden rounded-[10px] border border-[#e5e6eb] bg-[#fbfbfc]">
            <div className="flex items-center justify-between bg-[#f2f3f5] px-3 py-1.5 text-xs text-[#646a73]">
                <span className="uppercase tracking-[0.5px]">
                    {lang}
                    {fileName ? ` · ${fileName}` : ''}
                </span>
                {/* 流式生成中内容还在变化, 隐藏操作按钮 */}
                {!streaming && (
                    <div className="flex items-center gap-1">
                        {runnable && (
                            <button
                                className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[#722ed1] hover:bg-[rgba(114,46,209,0.1)]"
                                onClick={run}
                                title="运行预览"
                            >
                                <PlayCircleOutlined /> 运行
                            </button>
                        )}
                        <button
                            className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[#722ed1] hover:bg-[rgba(114,46,209,0.1)]"
                            onClick={copy}
                        >
                            {copied ? '已复制' : '复制'}
                        </button>
                    </div>
                )}
            </div>
            {/* 流式生成中内容逐 token 变化, 用 rehype-highlight 高亮的 pre 渲染; 结束后再挂载 Monaco */}
            {streaming ? (
                <pre className={className}>
                    <code className={className} {...rest}>
                        {children}
                    </code>
                </pre>
            ) : (
                <div style={{ height: blockHeight(code) }}>
                    <MonacoEditor value={code} language={MONACO_LANG[lang] || 'plaintext'} readOnly />
                </div>
            )}
        </div>
    );
};

const Markdown = ({ children, streaming }) => {
    // 收集当前渲染中的所有代码块 (供"运行"按钮把同一条回复里的代码块归组进项目)
    const blocksRef = useRef([]);
    const ctx = useMemo(
        () => ({
            register: entry => {
                blocksRef.current = [...blocksRef.current, entry];
                return () => {
                    blocksRef.current = blocksRef.current.filter(item => item !== entry);
                };
            },
            collect: () => [...blocksRef.current]
        }),
        []
    );

    return (
        <div className="markdown-body">
            <BlocksContext.Provider value={ctx}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                        // 映射掉外层 pre 避免 <pre><div>...</div></pre> 的非法嵌套
                        pre: ({ children }) => <>{children}</>,
                        code: props => <CodeBlock {...props} streaming={streaming} />
                    }}
                >
                    {children}
                </ReactMarkdown>
            </BlocksContext.Provider>
        </div>
    );
};

export default Markdown;
