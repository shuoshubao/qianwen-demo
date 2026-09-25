import { PlayCircleOutlined } from '@ant-design/icons';
import 'highlight.js/styles/github.css';
import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useRunner } from '../runnerContext';

// 支持「运行」的语言，与 CodeRunner 的 LANG_MAP 对应
const RUNNABLE_LANGS = ['html', 'xml', 'svg', 'css', 'js', 'javascript', 'ts', 'typescript'];

function CodeBlock({ inline, className, children, ...props }) {
    const [copied, setCopied] = useState(false);
    const preRef = useRef(null);
    const { openRunner } = useRunner();
    if (inline) {
        return (
            <code className="rounded bg-[rgba(15,20,30,0.06)] px-1.5 py-0.5 font-mono text-[13px] text-[#d63384]" {...props}>
                {children}
            </code>
        );
    }
    const lang = /language-(\w+)/.exec(className || '')?.[1] || '';
    const runnable = RUNNABLE_LANGS.includes(lang);

    const codeText = () => preRef.current?.innerText ?? '';

    // children 经 rehype-highlight 处理后是高亮 span 元素数组，
    // 直接转字符串会得到 [object Object]，改为从 DOM 取纯文本
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
                <div className="flex items-center gap-1">
                    {runnable && (
                        <button
                            className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[#722ed1] hover:bg-[rgba(114,46,209,0.1)]"
                            onClick={() => openRunner(codeText(), lang)}
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
            </div>
            <pre ref={preRef} className={className}>
                <code className={className} {...props}>
                    {children}
                </code>
            </pre>
        </div>
    );
}

export default function Markdown({ children }) {
    return (
        <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ code: CodeBlock }}>
                {children}
            </ReactMarkdown>
        </div>
    );
}
