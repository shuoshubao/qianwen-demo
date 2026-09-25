import { EditOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MODELS, streamChat } from './api/ollama';
import './App.scss';
import ChatInput from './components/ChatInput';
import MessageItem from './components/MessageItem';

let idSeq = 0;
const nextId = () => `m_${Date.now()}_${idSeq++}`;

export default function App() {
    const [model, setModel] = useState(MODELS[0].id);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
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
        <div className="app">
            <header className="topbar">
                <div className="topbar-left">
                    <span className="logo">豆包 · 本地对话</span>
                    <Select
                        value={model}
                        onChange={setModel}
                        variant="filled"
                        style={{ minWidth: 170 }}
                        disabled={loading}
                        options={MODELS.map(m => ({ value: m.id, label: m.name }))}
                    />
                </div>
                <button className="new-chat" onClick={newChat} disabled={loading}>
                    <EditOutlined /> 新对话
                </button>
            </header>

            <main className="chat-scroll" ref={scrollRef}>
                <div className="chat-inner">
                    {empty ? (
                        <div className="welcome">
                            <div className="welcome-emoji">👋</div>
                            <h1>你好，我是本地大模型助手</h1>
                            <p>
                                当前模型：{currentModel.name}
                                {currentModel.vision ? '（支持图片理解）' : '（支持深度思考）'}
                            </p>
                        </div>
                    ) : (
                        messages.map((m, i) => <MessageItem key={m.id} message={m} streaming={loading && i === messages.length - 1} />)
                    )}
                </div>
            </main>

            <footer className="composer-bar">
                <div className="chat-inner">
                    <ChatInput onSend={handleSend} onStop={handleStop} loading={loading} allowImage={currentModel.vision} />
                </div>
            </footer>
        </div>
    );
}
