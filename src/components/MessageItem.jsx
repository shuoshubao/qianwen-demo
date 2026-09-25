import { useState } from 'react';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import Markdown from './Markdown';
import ReasoningPanel from './ReasoningPanel';
import { splitThinking } from '../api/ollama';

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function MessageMeta({ time, text, align }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };
    return (
        <div className={`msg-meta msg-meta-${align}`}>
            <span className="msg-time">{formatTime(time)}</span>
            <button className="msg-copy" onClick={copy} title="复制">
                {copied ? <CheckOutlined /> : <CopyOutlined />}
                <span>{copied ? '已复制' : '复制'}</span>
            </button>
        </div>
    );
}

export default function MessageItem({ message, streaming }) {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="msg msg-user">
                <div className="msg-body">
                    {message.images?.length > 0 && (
                        <div className="msg-images">
                            {message.images.map((src, i) => (
                                <img key={i} src={src} alt="upload" />
                            ))}
                        </div>
                    )}
                    <div className="bubble bubble-user">{message.content}</div>
                    <MessageMeta time={message.time} text={message.content} align="right" />
                </div>
            </div>
        );
    }

    const { reasoning, answer } = splitThinking(message.content || '');
    const thinking = streaming && reasoning && !answer;
    const isEmpty = !reasoning && !answer;

    return (
        <div className="msg msg-assistant">
            <div className="msg-body">
                <ReasoningPanel reasoning={reasoning} thinking={thinking} />
                <div className="bubble bubble-assistant">
                    {isEmpty && streaming ? (
                        <span className="typing">
                            <i></i>
                            <i></i>
                            <i></i>
                        </span>
                    ) : (
                        <Markdown>{answer || (reasoning ? '' : message.content)}</Markdown>
                    )}
                </div>
                {!streaming && !isEmpty && <MessageMeta time={message.time} text={answer || message.content} align="left" />}
            </div>
        </div>
    );
}
