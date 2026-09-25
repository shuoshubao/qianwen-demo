import 'highlight.js/styles/github.css';
import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import './Markdown.scss';

function CodeBlock({ inline, className, children, ...props }) {
    const [copied, setCopied] = useState(false);
    const preRef = useRef(null);
    if (inline) {
        return (
            <code className="md-inline-code" {...props}>
                {children}
            </code>
        );
    }
    const lang = /language-(\w+)/.exec(className || '')?.[1] || '';

    // children 经 rehype-highlight 处理后是高亮 span 元素数组，
    // 直接转字符串会得到 [object Object]，改为从 DOM 取纯文本
    const copy = async () => {
        try {
            const text = preRef.current?.innerText ?? '';
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="md-code-wrap">
            <div className="md-code-head">
                <span className="md-code-lang">{lang || 'text'}</span>
                <button className="md-code-copy" onClick={copy}>
                    {copied ? '已复制' : '复制'}
                </button>
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
