import { PlayCircleOutlined } from '@ant-design/icons';
import 'highlight.js/styles/github.css';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useRunner } from '../runnerContext';
import { rehypeFileNames } from '../utils/projectFiles';

// 支持运行的语言: 仅限本身可独立渲染成完整页面的文档,
// css/js 片段拼出预览是空白页, 无需运行按钮 (见 CodeRunner.buildHtml)
const RUNNABLE_LANGS = ['html', 'xml', 'svg'];

// 提供给各代码块注册自身, 点击运行时把同一 Markdown 里的所有代码块归组成一个项目
const BlocksContext = createContext(null);

// 无文件名标注时的默认文件名(同名时追加序号去重)
const DEFAULT_NAMES = {
    html: 'index.html',
    xml: 'index.html',
    svg: 'index.svg',
    css: 'style.css',
    js: 'script.js',
    javascript: 'script.js',
    ts: 'script.ts',
    typescript: 'script.ts',
    json: 'data.json'
};

const CodeBlock = ({ className, children, node, streaming, ...rest }) => {
    const [copied, setCopied] = useState(false);
    const preRef = useRef(null);
    const { openRunner } = useRunner();
    const blocks = useContext(BlocksContext);
    const lang = /language-(\w+)/.exec(className || '')?.[1] || '';

    // 挂载时注册到所属 Markdown 的代码块集合, 供"运行"按钮收集整个项目;
    // 仅带语言标注的块级代码参与 (行内 code / 无语言代码块会生成 .txt 噪音文件)
    useEffect(() => {
        if (!blocks || !lang) return;
        return blocks.register({ lang, getText: () => preRef.current?.innerText ?? '' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // react-markdown v9 不再传 inline prop, 带 language-* 类名的是块级代码,
    // 否则 (如段落内的 `code`) 按行内渲染, 避免 div/pre 嵌套进 <p>
    if (!lang) {
        return (
            <code className="rounded bg-[rgba(15,20,30,0.06)] px-1.5 py-0.5 font-mono text-[13px] text-[#d63384]" {...rest}>
                {children}
            </code>
        );
    }
    const runnable = RUNNABLE_LANGS.includes(lang);

    const codeText = () => preRef.current?.innerText ?? '';

    // 收集当前 Markdown 内全部代码块组成项目文件列表, 未标注文件名的用默认名(同名去重)
    const run = () => {
        if (!blocks) return;
        const used = new Set();
        const files = blocks.collect().map(b => {
            let name = b.name || DEFAULT_NAMES[b.lang] || `${b.lang}.txt`;
            if (used.has(name)) {
                const dot = name.lastIndexOf('.');
                name = `${name.slice(0, dot)}-${used.size}${name.slice(dot)}`;
            }
            used.add(name);
            return { name, lang: b.lang, code: b.getText() };
        });
        openRunner(files);
    };

    // children 经 rehype-highlight 处理后是高亮 span 元素数组,
    // 直接转字符串会得到 [object Object], 改为从 DOM 取纯文本
    const copy = async () => {
        try {
            const text = codeText();
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="mb-3 overflow-hidden rounded-[10px] border border-[#e5e6eb] bg-[#fbfbfc]">
            <div className="flex items-center justify-between bg-[#f2f3f5] px-3 py-1.5 text-xs text-[#646a73]">
                <span className="uppercase tracking-[0.5px]">{lang || 'text'}</span>
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
            <pre ref={preRef} className={className}>
                <code className={className} {...rest}>
                    {children}
                </code>
            </pre>
        </div>
    );
};

const Markdown = ({ children, streaming }) => {
    // 收集当前渲染中的所有代码块 (供"运行"按钮把同一条回复里的 css/js 片段归组进项目)
    const blocksRef = useRef([]);
    const ctx = useMemo(
        () => ({
            register: entry => {
                blocksRef.current = [...blocksRef.current, entry];
                return () => {
                    blocksRef.current = blocksRef.current.filter(x => x !== entry);
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
                    rehypePlugins={[rehypeFileNames, rehypeHighlight]}
                    components={{
                        // react-markdown 默认渲染 <pre><code>, 而 CodeBlock 非行内分支自带 pre,
                        // 映射掉外层 pre 避免 <pre><div>...</div></pre> 的非法嵌套 (双 pre 样式叠加)
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
