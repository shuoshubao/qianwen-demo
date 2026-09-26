import { ArrowUpOutlined, CloseOutlined, FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { message } from 'antd';

// 文本文件大小上限, 超出提示跳过 (避免撑爆上下文)
const FILE_LIMIT = 512 * 1024;

const formatSize = bytes => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const ChatInput = ({ onSend, onStop, loading, allowImage }) => {
    const [text, setText] = useState('');
    const [images, setImages] = useState([]); // { url, base64 }
    const [files, setFiles] = useState([]); // { name, size, content }
    const fileRef = useRef(null);
    const taRef = useRef(null);

    const autoResize = el => {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    };

    // 图片走 images 字段 (base64), 其他文件读取文本内容拼入消息
    const pickFiles = async e => {
        const picked = Array.from(e.target.files || []);
        const nextImages = [];
        const nextFiles = [];
        for (const item of picked) {
            if (item.type.startsWith('image/')) {
                const url = URL.createObjectURL(item);
                const base64 = await new Promise(resolve => {
                    const r = new FileReader();
                    r.onload = () => resolve(String(r.result).split(',')[1] || '');
                    r.readAsDataURL(item);
                });
                nextImages.push({ url, base64 });
            } else {
                if (item.size > FILE_LIMIT) {
                    message.warning(`文件 ${item.name} 超过 512KB, 已跳过`);
                    continue;
                }
                nextFiles.push({ name: item.name, size: item.size, content: await item.text() });
            }
        }
        setImages(prev => [...prev, ...nextImages]);
        setFiles(prev => [...prev, ...nextFiles]);
        e.target.value = '';
    };

    const removeImage = index => {
        setImages(prev => prev.filter((item, index1) => index1 !== index));
    };

    const submit = () => {
        if (loading) {
            return;
        }
        const value = text.trim();
        if (!value && images.length === 0 && files.length === 0) {
            return;
        }
        // 文本文件按代码块拼入消息内容, 模型按文本分析; 图片仍走 images 字段
        const fileText = files.map(item => {
            const ext = item.name.includes('.') ? item.name.split('.').pop() : '';
            return `[文件: ${item.name}]\n\`\`\`${ext}\n${item.content}\n\`\`\``;
        });
        onSend([value, ...fileText].filter(Boolean).join('\n\n'), images);
        setText('');
        setImages([]);
        setFiles([]);
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

    const canSend = (text.trim() || images.length > 0 || files.length > 0) && !loading;

    return (
        <div className="rounded-[20px] border border-[#e5e6eb] bg-white p-2.5 px-3 shadow-[0_6px_24px_rgba(15,20,30,0.06)] transition-colors focus-within:border-[#722ed1]">
            {images.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1.5 pt-1.5 pb-2.5">
                    {images.map((item, index) => (
                        <div className="relative" key={index}>
                            <img src={item.url} alt="preview" className="h-16 w-16 rounded-lg object-cover" />
                            <button
                                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
                                onClick={() => removeImage(index)}
                            >
                                <CloseOutlined />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1.5 pt-1.5 pb-2.5">
                    {files.map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5 rounded-lg border border-[#e5e6eb] bg-[#f7f8fa] py-1.5 pr-1.5 pl-2.5">
                            <FileTextOutlined className="text-[#722ed1]" />
                            <span className="max-w-[180px] truncate text-[13px] text-[#1f2329]">{item.name}</span>
                            <span className="text-xs text-[#8a9099]">{formatSize(item.size)}</span>
                            <button
                                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[10px] text-[#8a9099] hover:bg-[#e7e9ee] hover:text-[#1f2329]"
                                onClick={() => setFiles(prev => prev.filter((item1, index1) => index1 !== index))}
                            >
                                <CloseOutlined />
                            </button>
                        </div>
                    ))}
                </div>
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
                {allowImage && (
                    <button
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg leading-none text-[#646a73] transition-colors hover:bg-[#f2f3f5] hover:text-[#722ed1]"
                        title="上传文件或图片"
                        onClick={() => fileRef.current?.click()}
                    >
                        <PaperClipOutlined />
                    </button>
                )}
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
            <input ref={fileRef} type="file" multiple hidden onChange={pickFiles} />
        </div>
    );
};

export default ChatInput;