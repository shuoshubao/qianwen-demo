import { CopyOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Checkbox, Image, Space, Tooltip } from 'antd';
import { cn } from 'cn';
import { isEqual, pick } from 'lodash';
import { memo } from 'react';
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
    return (
        <Space
            size={10}
            align="center"
            className={cn('text-xs text-[#a8adb5] opacity-0 transition-opacity group-hover:opacity-100', align === 'right' ? 'justify-end' : 'justify-start')}
        >
            {showTime && <span className="leading-none">{formatTime(time)}</span>}
            <Tooltip title="复制">
                <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => {
                        if (text) {
                            navigator.clipboard.writeText(text);
                        }
                    }}
                    className="p-0.5 text-xs leading-none text-[#a8adb5]! hover:text-[#722ed1]!"
                />
            </Tooltip>
            {onDelete && (
                <Tooltip title="删除">
                    <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={onDelete}
                        className="p-0.5 text-xs leading-none text-[#a8adb5]! hover:text-[#f53f3f]!"
                    />
                </Tooltip>
            )}
        </Space>
    );
};

// memo: 流式更新时只有最后一条消息会变, 历史消息跳过重渲染,
// 否则历史消息里的 Monaco 代码块会随每个 token 反复重渲染导致闪烁
const MessageItem = memo(
    ({ message, streaming, bulkMode, checked, onToggleSelect, onDelete, disabled }) => {
        const isUser = message.role === 'user';
        const { openFile } = useRunner() ?? {};
        // 加载中 / 批量模式下隐藏单条删除入口
        const showDelete = !disabled && !bulkMode;

        if (isUser) {
            const atts = message.attachments ?? [];
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
                                    <Space wrap size={8} align="center" className="justify-end">
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
                                    </Space>
                                </Image.PreviewGroup>
                            )}
                            {message.content && (
                                <div className="rounded-[14px] bg-[rgba(0,0,0,0.04)] px-4 py-3 text-[15px] leading-[1.75] break-words whitespace-pre-wrap text-[#1f2329]">
                                    {message.content}
                                </div>
                            )}
                            {!bulkMode && (
                                <MessageMeta
                                    time={message.time}
                                    text={message.content}
                                    align="right"
                                    onDelete={showDelete ? () => onDelete(message.id) : undefined}
                                />
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        const { reasoning, answer } = splitThinking(message.content ?? '');
        const thinking = streaming && reasoning && !answer;
        const isEmpty = !reasoning && !answer;

        return (
            <div className="group flex flex-col">
                <div className={cn('flex w-full items-start gap-2.5', bulkMode && 'rounded-[10px] px-2 py-2', bulkMode && checked && 'bg-[rgba(0,0,0,0.04)]')}>
                    {bulkMode && <Checkbox className="mt-3.5" checked={checked} onChange={() => onToggleSelect(message.id)} />}
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <ReasoningPanel reasoning={reasoning} thinking={thinking} />
                        <div className={cn('w-full text-[15px] leading-[1.75] text-[#1f2329]', bulkMode && 'px-4 py-3')}>
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
                                onDelete={showDelete ? () => onDelete(message.id) : undefined}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    },
    (prev, next) => {
        const COMPARE_KEYS = ['message', 'streaming', 'bulkMode', 'checked', 'disabled'];
        return isEqual(pick(prev, COMPARE_KEYS), pick(next, COMPARE_KEYS));
    }
);

export default MessageItem;
