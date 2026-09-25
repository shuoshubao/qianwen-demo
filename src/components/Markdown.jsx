import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import './Markdown.css'

function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false)
  if (inline) {
    return (
      <code className="md-inline-code" {...props}>
        {children}
      </code>
    )
  }
  const lang = /language-(\w+)/.exec(className || '')?.[1] || ''
  const text = String(children).replace(/\n$/, '')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="md-code-wrap">
      <div className="md-code-head">
        <span className="md-code-lang">{lang || 'text'}</span>
        <button className="md-code-copy" onClick={copy}>
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className={className}>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  )
}

export default function Markdown({ children }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ code: CodeBlock }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
