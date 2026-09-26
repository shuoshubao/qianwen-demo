import { ArrowUpOutlined, CloseOutlined, PictureOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';

const ChatInput = ({ onSend, onStop, loading, allowImage }) => {
    const [text, setText] = useState('');
    const [images, setImages] = useState([]); // { url, base64 }
    const fileRef = useRef(null);
    const taRef = useRef(null);

    const autoResize = el => {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    };

    const pickImages = async e => {
        const files = Array.from(e.target.files || []);
        const next = [];
        for (const item of files) {
            const url = URL.createObjectURL(item);
            const base64 = await new Promise(resolve => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result).split(',')[1] || '');
                r.readAsDataURL(item);
            });
            next.push({ url, base64 });
        }
        setImages(prev => [...prev, ...next]);
        e.target.value = '';
    };

    const removeImage = index => {
        setImages(prev => prev.filter((item, index1) => index1 !== index));
    };

    const submit = () => {
        if (loading) return;
        const value = text.trim();
        if (!value && images.length === 0) return;
        onSend(value, images);
        setText('');
        setImages([]);
        if (taRef.current) taRef.current.style.height = 'auto';
    };

    const onKeyDown = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    const canSend = (text.trim() || images.length > 0) && !loading;

    return (
        <div className="rounded-[20px] border border-[#e5e6eb] bg-white p-2.5 px-3 shadow-[0_6px_24px_rgba(15,20,30,0.06)] transition-colors focus-within:border-[#3370ff]">
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
            <div className="flex items-end gap-2">
                {allowImage && (
                    <button
                        className="cursor-pointer rounded-lg p-1.5 text-xl leading-none text-[#646a73] hover:bg-[#f2f3f5] hover:text-[#3370ff]"
                        title="上传图片"
                        onClick={() => fileRef.current?.click()}
                    >
                        <PictureOutlined />
                    </button>
                )}
                <textarea
                    ref={taRef}
                    className="max-h-[200px] flex-1 resize-none bg-transparent px-1 py-1.5 text-[15px] leading-[1.6] text-[#1f2329] outline-none"
                    placeholder="给 AI 发送消息, Enter 发送, Shift+Enter 换行"
                    value={text}
                    rows={1}
                    onChange={e => {
                        setText(e.target.value);
                        autoResize(e.target);
                    }}
                    onKeyDown={onKeyDown}
                />
                {loading ? (
                    <button
                        className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#1f2329] text-base text-white"
                        onClick={onStop}
                        title="停止"
                    >
                        <span className="h-3 w-3 rounded-[3px] bg-white" />
                    </button>
                ) : (
                    <button
                        className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#3370ff] to-[#5b8cff] text-base text-white transition-opacity disabled:cursor-not-allowed disabled:bg-[#d0d3d9]"
                        disabled={!canSend}
                        onClick={submit}
                        title="发送"
                    >
                        <ArrowUpOutlined />
                    </button>
                )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickImages} />
        </div>
    );
};

export default ChatInput;