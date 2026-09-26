import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { cn } from 'cn';
import { memo, useState } from 'react';
import { splitThinking } from '../api/ollama';
import Markdown from './Markdown';
import ReasoningPanel from './ReasoningPanel';

const formatTime = ts => {
    if (!ts) {
        return '';
    }
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

const MessageMeta = ({ time, text, align }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        if (!text) {
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };
    return (
        <div
            className={cn(
                'flex items-center gap-2.5 text-xs text-[#a8adb5] opacity-0 transition-opacity group-hover:opacity-100',
                align === 'right' ? 'justify-end' : 'justify-start'
            )}
        >
            <span className="leading-none">{formatTime(time)}</span>
            <button
                className="inline-flex cursor-pointer items-center gap-1 rounded p-0.5 text-xs leading-none text-[#a8adb5] hover:bg-[#f2f3f5] hover:text-[#722ed1]"
                onClick={copy}
                title="复制"
            >
                {copied ? <CheckOutlined /> : <CopyOutlined />}
                <span>{copied ? '已复制' : '复制'}</span>
            </button>
        </div>
    );
};

// memo: 流式更新时只有最后一条消息的对象引用会变, 历史消息跳过重渲染
const MessageItem = memo(({ message, streaming }) => {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="group mb-6 flex flex-col items-end">
                <div className="flex max-w-[85%] flex-col items-end gap-2">
                    {message.images?.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2">
                            {message.images.map((item, index) => (
                                <img key={index} src={item} alt="upload" className="max-h-[180px] max-w-[180px] rounded-[10px] object-cover" />
                            ))}
                        </div>
                    )}
                    <div className="rounded-[14px] bg-[#f2f3f5] px-4 py-3 text-[15px] leading-[1.75] break-words whitespace-pre-wrap text-[#1f2329]">
                        {message.content}
                    </div>
                    <MessageMeta time={message.time} text={message.content} align="right" />
                </div>
            </div>
        );
    }

    const { reasoning, answer } = splitThinking(message.content || '');
    const thinking = streaming && reasoning && !answer;
    const isEmpty = !reasoning && !answer;

    return (
        <div className="group mb-6 flex flex-col">
            <div className="flex w-full flex-col gap-2">
                <ReasoningPanel reasoning={reasoning} thinking={thinking} />
                <div className="w-full rounded-[14px] bg-white px-4 py-3 text-[15px] leading-[1.75] text-[#1f2329]">
                    {isEmpty && streaming ? (
                        <span className="inline-flex h-5 items-center gap-1">
                            <i className="h-1.5 w-1.5 rounded-full bg-[#b5bcc7] [animation:blink_1.2s_infinite_ease-in-out]"></i>
                            <i className="h-1.5 w-1.5 rounded-full bg-[#b5bcc7] [animation:blink_1.2s_infinite_ease-in-out] [animation-delay:0.2s]"></i>
                            <i className="h-1.5 w-1.5 rounded-full bg-[#b5bcc7] [animation:blink_1.2s_infinite_ease-in-out] [animation-delay:0.4s]"></i>
                        </span>
                    ) : (
                        <Markdown streaming={streaming}>{answer || (reasoning ? '' : message.content)}</Markdown>
                    )}
                </div>
                {!streaming && !isEmpty && <MessageMeta time={message.time} text={answer || message.content} align="left" />}
            </div>
        </div>
    );
});

export default MessageItem;
