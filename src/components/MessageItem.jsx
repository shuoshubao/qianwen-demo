import { CheckOutlined, CopyOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Checkbox, Image } from 'antd';
import { cn } from 'cn';
import { memo, useState } from 'react';
import { splitThinking } from '../api/ollama';
import { useRunner } from '../runnerContext';
import { getFileMeta } from '../utils/fileMeta';
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

const MessageMeta = ({ time, text, align, showTime = true, onDelete }) => {
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
            {showTime && <span className="leading-none">{formatTime(time)}</span>}
            <button
                className="inline-flex cursor-pointer items-center gap-1 rounded p-0.5 text-xs leading-none text-[#a8adb5] hover:text-[#722ed1]"
                onClick={copy}
                title="复制"
            >
                {copied ? <CheckOutlined /> : <CopyOutlined />}
                <span>{copied ? '已复制' : '复制'}</span>
            </button>
            {onDelete && (
                <button
                    className="inline-flex cursor-pointer items-center gap-1 rounded p-0.5 text-xs leading-none text-[#a8adb5] hover:text-[#f53f3f]"
                    onClick={onDelete}
                    title="删除"
                >
                    <DeleteOutlined />
                    <span>删除</span>
                </button>
            )}
        </div>
    );
};

// memo: 流式更新时只有最后一条消息的对象引用会变, 历史消息跳过重渲染
const MessageItem = memo(({ message, streaming, bulkMode, checked, onToggleSelect, onDelete, disabled }) => {
    const isUser = message.role === 'user';
    const { openFile } = useRunner() || {};
    // 加载中 / 批量模式下隐藏单条删除入口
    const showDelete = !disabled && !bulkMode;

    if (isUser) {
        const atts = message.attachments || [];
        return (
            <div className="group flex flex-col items-end">
                <div
                    className={cn(
                        'flex w-full items-start gap-2.5',
                        bulkMode ? 'justify-between' : 'justify-end',
                        bulkMode && 'rounded-[10px] px-2 py-2',
                        bulkMode && checked && 'bg-[rgba(0,0,0,0.04)]'
                    )}
                >
                    {bulkMode && <Checkbox className="mt-3.5" checked={checked} onChange={() => onToggleSelect(message.id)} />}
                    <div className="flex min-w-0 max-w-[85%] flex-col items-end gap-2">
                        {atts.length > 0 && (
                            <Image.PreviewGroup>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {atts.map((item, index) => {
                                        if (item.kind === 'image') {
                                            return (
                                                <Image
                                                    key={index}
                                                    src={item.data}
                                                    alt="attachment"
                                                    width={52}
                                                    height={52}
                                                    className="rounded-lg object-cover"
                                                    preview={{ mask: <EyeOutlined /> }}
                                                />
                                            );
                                        }
                                        const meta = getFileMeta(item.name);
                                        return (
                                            <div
                                                key={index}
                                                className="flex h-[54px] w-[200px] cursor-pointer items-center gap-2 rounded-[10px] bg-[#f2f3f5] px-3 transition-colors hover:bg-[#e9eaee]"
                                                title="点击打开文件预览"
                                                onClick={() => openFile?.({ name: item.name, size: item.size, content: item.content })}
                                            >
                                                <img src={meta.icon} alt="" className="h-7 w-7 flex-shrink-0" />
                                                <div className="flex min-w-0 flex-col">
                                                    <span className="truncate text-[14px] leading-[1.35] font-medium text-[#1f2329]">{item.name}</span>
                                                    <span className="text-xs leading-[1.35] text-[#8a9099]">{meta.type}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Image.PreviewGroup>
                        )}
                        {message.content && (
                            <div className="rounded-[14px] bg-[rgba(0,0,0,0.04)] px-4 py-3 text-[15px] leading-[1.75] break-words whitespace-pre-wrap text-[#1f2329]">
                                {message.content}
                            </div>
                        )}
                        {!bulkMode && <MessageMeta time={message.time} text={message.content} align="right" onDelete={showDelete ? onDelete : undefined} />}
                    </div>
                </div>
            </div>
        );
    }

    const { reasoning, answer } = splitThinking(message.content || '');
    const thinking = streaming && reasoning && !answer;
    const isEmpty = !reasoning && !answer;

    return (
        <div className="group flex flex-col">
            <div className={cn('flex w-full items-start gap-2.5', bulkMode && 'rounded-[10px] px-2 py-2', bulkMode && checked && 'bg-[rgba(0,0,0,0.04)]')}>
                {bulkMode && <Checkbox className="mt-3.5" checked={checked} onChange={() => onToggleSelect(message.id)} />}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
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
                    {!streaming && !isEmpty && !bulkMode && (
                        <MessageMeta
                            time={message.time}
                            text={answer || message.content}
                            align="left"
                            showTime={false}
                            onDelete={showDelete ? onDelete : undefined}
                        />
                    )}
                </div>
            </div>
        </div>
    );
});

export default MessageItem;
