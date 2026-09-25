import { EditOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MODELS, streamChat } from './api/ollama';
import ChatInput from './components/ChatInput';
import CodeRunner from './components/CodeRunner';
import MessageItem from './components/MessageItem';
import { RunnerContext } from './runnerContext';

let idSeq = 0;
const nextId = () => `m_${Date.now()}_${idSeq++}`;

export default function App() {
    const [model, setModel] = useState(MODELS[0].id);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [runner, setRunner] = useState(null); // { code, lang } | null
    const abortRef = useRef(null);
    const scrollRef = useRef(null);

    const currentModel = useMemo(() => MODELS.find(m => m.id === model), [model]);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const handleSend = async (text, images) => {
        const userMsg = {
            id: nextId(),
            role: 'user',
            content: text,
            images: images.map(i => `data:image/*;base64,${i.base64}`),
            _base64: images.map(i => i.base64),
            time: Date.now()
        };
        const assistantMsg = {
            id: nextId(),
            role: 'assistant',
            content: '',
            time: Date.now()
        };
        const history = [...messages, userMsg];
        setMessages([...history, assistantMsg]);
        setLoading(true);

        // 组装发给 Ollama 的消息（携带图片 base64）
        const payload = history.map(m => {
            const item = { role: m.role, content: m.content };
            if (m._base64?.length) item.images = m._base64;
            return item;
        });

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            await streamChat({
                model,
                messages: payload,
                signal: controller.signal,
                onToken: chunk => {
                    setMessages(prev => prev.map(m => (m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m)));
                }
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMsg.id
                            ? {
                                  ...m,
                                  content: m.content + `\n\n> ⚠️ 请求出错：${err.message}\n> 请确认 Ollama 已启动（\`ollama serve\`）且模型已拉取。`
                              }
                            : m
                    )
                );
            }
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
    };

    const newChat = () => {
        if (loading) return;
        setMessages([]);
    };

    const empty = messages.length === 0;

    return (
        <RunnerContext.Provider value={{ openRunner: (code, lang) => setRunner({ code, lang }) }}>
            <div className="flex h-screen flex-col bg-[#edf0f5]">
                <header className="flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-3 backdrop-blur-md">
                    <Select
                        value={model}
                        onChange={setModel}
                        variant="filled"
                        style={{ minWidth: 170 }}
                        disabled={loading}
                        options={MODELS.map(m => ({ value: m.id, label: m.name }))}
                    />
                    <button
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#e5e6eb] bg-white px-3.5 py-1.5 text-sm text-[#1f2329] transition-colors hover:border-[#3370ff] hover:text-[#3370ff] disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={newChat}
                        disabled={loading}
                    >
                        <EditOutlined /> 新对话
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto py-6" ref={scrollRef}>
                    <div className="mx-auto w-full max-w-[860px] px-5">
                        {empty ? (
                            <div className="mt-[12vh] text-center text-[#1f2329]">
                                <div className="text-5xl">👋</div>
                                <h1 className="my-4 mb-2 text-[26px] font-bold">你好，我是本地大模型助手</h1>
                                <p className="text-[15px] text-[#8a9099]">
                                    当前模型：{currentModel.name}
                                    {currentModel.vision ? '（支持图片理解）' : '（支持深度思考）'}
                                </p>
                            </div>
                        ) : (
                            messages.map((m, i) => <MessageItem key={m.id} message={m} streaming={loading && i === messages.length - 1} />)
                        )}
                    </div>
                </main>

                <footer className="pt-2 pb-[18px]">
                    <div className="mx-auto w-full max-w-[860px] px-5">
                        <ChatInput onSend={handleSend} onStop={handleStop} loading={loading} allowImage={currentModel.vision} />
                    </div>
                </footer>
                <CodeRunner runner={runner} onClose={() => setRunner(null)} />
            </div>
        </RunnerContext.Provider>
    );
}
