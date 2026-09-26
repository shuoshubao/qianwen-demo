import { ArrowUpOutlined, CloseOutlined, PaperClipOutlined } from '@ant-design/icons';
import { message, Select, Space, Tooltip } from 'antd';
import { useRef, useState } from 'react';
import { MODELS } from '../api/ollama';
import { formatSize, getFileMeta } from '../utils/fileMeta';

// 文本文件大小上限, 超出提示跳过 (避免撑爆上下文)
const FILE_LIMIT = 512 * 1024;

// 不支持图片的模型, 文件选择器只给文本/代码类 (accept 只是建议, pickFiles 里仍有防御性拦截)
const TEXT_ACCEPT = 'application/javascript,.ts,.tsx,.jsx,.vue,text/*,application/json,application/xml,.sh';

const ChatInput = ({ onSend, onStop, loading, allowImage, model, onModelChange }) => {
    const [text, setText] = useState('');
    // 按选择顺序统一存放: { kind: 'image', url, base64 } | { kind: 'file', name, size, content }
    const [attachments, setAttachments] = useState([]);
    const fileRef = useRef(null);
    const taRef = useRef(null);

    const autoResize = el => {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    };

    // 图片走 images 字段 (base64), 其他文件读取文本内容拼入消息
    const pickFiles = async e => {
        const picked = Array.from(e.target.files || []);
        const next = [];
        for (const item of picked) {
            if (item.type.startsWith('image/')) {
                if (!allowImage) {
                    // 非多模态模型无法消费图片, 直接拦截
                    message.warning('当前模型不支持图片, 仅支持文本文件');
                    continue;
                }
                const url = URL.createObjectURL(item);
                const base64 = await new Promise(resolve => {
                    const r = new FileReader();
                    r.onload = () => resolve(String(r.result).split(',')[1] || '');
                    r.readAsDataURL(item);
                });
                next.push({ kind: 'image', url, base64 });
            } else {
                if (item.size > FILE_LIMIT) {
                    message.warning(`文件 ${item.name} 超过 512KB, 已跳过`);
                    continue;
                }
                next.push({ kind: 'file', name: item.name, size: item.size, content: await item.text() });
            }
        }
        setAttachments(prev => [...prev, ...next]);
        e.target.value = '';
    };

    const removeAttachment = index => {
        setAttachments(prev => prev.filter((item, index1) => index1 !== index));
    };

    const submit = () => {
        if (loading) {
            return;
        }
        const value = text.trim();
        if (!value && attachments.length === 0) {
            return;
        }
        onSend(value, attachments);
        setText('');
        setAttachments([]);
        if (taRef.current) {
            taRef.current.style.height = 'auto';
        }
    };

    const onKeyDown = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    const canSend = (text.trim() || attachments.length > 0) && !loading;

    return (
        <div className="rounded-[20px] border border-[#e5e6eb] bg-white p-2.5 px-3 shadow-[0_6px_24px_rgba(15,20,30,0.06)] transition-colors focus-within:border-[#722ed1]">
            {attachments.length > 0 && (
                <Space wrap size={8} className="px-1.5 pt-1.5 pb-2.5">
                    {attachments.map((item, index) => {
                        if (item.kind === 'image') {
                            return (
                                <div className="group relative" key={index}>
                                    <img src={item.url} alt="preview" className="h-[52px] w-[52px] rounded-lg object-cover" />
                                    <button
                                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() => removeAttachment(index)}
                                        title="移除"
                                    >
                                        <CloseOutlined />
                                    </button>
                                </div>
                            );
                        }
                        const meta = getFileMeta(item.name);
                        return (
                            <div
                                key={index}
                                className="group relative flex h-[54px] w-[200px] items-center gap-2 rounded-[10px] bg-[#f2f3f5] px-3"
                                title={item.name}
                            >
                                <img src={meta.icon} alt="" className="h-7 w-7 flex-shrink-0" />
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-[14px] leading-[1.35] font-medium text-[#1f2329]">{item.name}</span>
                                    <span className="text-xs leading-[1.35] text-[#8a9099]">
                                        {meta.type} · {formatSize(item.size)}
                                    </span>
                                </div>
                                <button
                                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={() => removeAttachment(index)}
                                    title="移除"
                                >
                                    <CloseOutlined />
                                </button>
                            </div>
                        );
                    })}
                </Space>
            )}
            <textarea
                ref={taRef}
                className="max-h-[200px] w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-[1.6] text-[#1f2329] outline-none"
                placeholder="给 AI 发送消息, Enter 发送, Shift+Enter 换行"
                value={text}
                rows={1}
                onChange={e => {
                    setText(e.target.value);
                    autoResize(e.target);
                }}
                onKeyDown={onKeyDown}
            />
            <div className="flex items-center justify-between pt-1.5">
                <Space size={8} align="center">
                    <Tooltip title={allowImage ? '上传文件或图片' : '上传文件'}>
                        <button
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg leading-none text-[#646a73] transition-colors hover:bg-[#f2f3f5] hover:text-[#722ed1]"
                            onClick={() => fileRef.current?.click()}
                        >
                            <PaperClipOutlined />
                        </button>
                    </Tooltip>
                    <Select
                        value={model}
                        onChange={onModelChange}
                        variant="filled"
                        size="small"
                        style={{ width: 150 }}
                        disabled={loading}
                        options={MODELS.map(item => ({ value: item.id, label: item.name }))}
                    />
                </Space>
                {loading ? (
                    <button
                        className="ml-auto flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#1f2329] text-base text-white"
                        onClick={onStop}
                        title="停止"
                    >
                        <span className="h-3 w-3 rounded-[3px] bg-white" />
                    </button>
                ) : (
                    <button
                        className="ml-auto flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#722ed1] to-[#9254de] text-base text-white transition-opacity disabled:cursor-not-allowed disabled:bg-[#d0d3d9]"
                        disabled={!canSend}
                        onClick={submit}
                        title="发送"
                    >
                        <ArrowUpOutlined />
                    </button>
                )}
            </div>
            <input ref={fileRef} type="file" multiple hidden accept={allowImage ? undefined : TEXT_ACCEPT} onChange={pickFiles} />
        </div>
    );
};

export default ChatInput;
