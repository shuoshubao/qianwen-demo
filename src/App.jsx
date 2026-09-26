import { DatabaseOutlined } from '@ant-design/icons';
import { Select, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MODELS, streamChat } from './api/ollama';
import ChatInput from './components/ChatInput';
import CodeRunner from './components/CodeRunner';
import MessageItem from './components/MessageItem';
import SessionList from './components/SessionList';
import StorageModal from './components/StorageModal';
import { addMessage, createSession, deleteSession, getSession, listMessages, listSessions, updateSession } from './db';
import { RunnerContext } from './runnerContext';

let idSeq = 0;
const nextId = () => `m_${Date.now()}_${idSeq++}`;

// 从库中读出的消息补上 _base64 (发给 Ollama 需要纯 base64), images 里存的是 data URL
const hydrateMessages = list =>
    list.map(item => ({
        ...item,
        _base64: item.images?.map(item1 => String(item1).split(',')[1])
    }));

const App = () => {
    const [model, setModel] = useState(MODELS[0].id);
    const [sessions, setSessions] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [runner, setRunner] = useState(null); // { code, lang } | null
    const [storageOpen, setStorageOpen] = useState(false);
    const abortRef = useRef(null);
    const scrollRef = useRef(null);
    const stickToBottomRef = useRef(true); // 用户是否停留在底部, 上滚看历史时暂停自动滚动

    const currentModel = useMemo(() => MODELS.find(item => item.id === model), [model]);

    // 启动时加载最近一个会话
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const list = await listSessions();
            if (cancelled) return;
            setSessions(list);
            if (list.length > 0) {
                const first = list[0];
                setActiveId(first.id);
                if (first.model) setModel(first.model);
                const msgs = await listMessages(first.id);
                if (!cancelled) setMessages(hydrateMessages(msgs));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // 距底部 40px 以内视为贴底, 恢复自动滚动 (阈值容差避免浮点误差)
    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const switchSession = async id => {
        if (loading || id === activeId) return;
        try {
            const session = await getSession(id);
            const msgs = await listMessages(id);
            setActiveId(id);
            if (session?.model) setModel(session.model);
            setMessages(hydrateMessages(msgs));
            stickToBottomRef.current = true;
        } catch {
            /* ignore */
        }
    };

    const newChat = () => {
        if (loading) return;
        const id = crypto.randomUUID();
        const now = Date.now();
        const session = { id, title: '', model, createdAt: now, updatedAt: now };
        createSession(session);
        setSessions(prev => [session, ...prev]);
        setActiveId(id);
        setMessages([]);
        stickToBottomRef.current = true;
    };

    const handleDeleteMany = async ids => {
        if (loading || ids.length === 0) return false;
        try {
            for (const item of ids) await deleteSession(item);
            const idSet = new Set(ids);
            const rest = sessions.filter(item => !idSet.has(item.id));
            setSessions(rest);
            if (idSet.has(activeId)) {
                if (rest.length > 0) {
                    await switchSession(rest[0].id);
                } else {
                    setActiveId(null);
                    setMessages([]);
                }
            }
            return true;
        } catch {
            return false;
        }
    };

    const handleDelete = id => handleDeleteMany([id]);

    const handleRename = (id, title) => {
        const t = (title || '').trim();
        if (!id || !t) return;
        updateSession(id, { title: t });
        setSessions(prev => prev.map(item => (item.id === id ? { ...item, title: t } : item)));
    };

    const handleSend = async (text, images) => {
        // 无会话时 (如启动后尚无历史) 先自动创建一个
        let sid = activeId;
        if (!sid) {
            sid = crypto.randomUUID();
            const now = Date.now();
            const session = { id: sid, title: '', model, createdAt: now, updatedAt: now };
            createSession(session);
            setSessions(prev => [session, ...prev]);
            setActiveId(sid);
        }

        const now = Date.now();
        const userMsg = {
            id: nextId(),
            role: 'user',
            content: text,
            images: images.map(item => `data:image/*;base64,${item.base64}`),
            _base64: images.map(item => item.base64),
            time: now
        };
        const assistantMsg = {
            id: nextId(),
            role: 'assistant',
            content: '',
            time: now + 1
        };
        let full = '';
        const history = [...messages, userMsg];
        setMessages([...history, assistantMsg]);
        setLoading(true);
        stickToBottomRef.current = true; // 发送新消息强制滚到底

        try {
            // 首条消息: 标题默认截取; 用户消息立即落库
            if (messages.length === 0) {
                const title = text.trim() ? text.trim().slice(0, 20) : images.length ? '[图片]' : '新对话';
                await updateSession(sid, { title });
                setSessions(prev => prev.map(item => (item.id === sid ? { ...item, title } : item)));
            }
            await addMessage({ ...userMsg, sessionId: sid });
        } catch {
            /* 存储失败不阻断对话 */
        }

        // 组装发给 Ollama 的消息 (携带图片 base64), 带上该会话全部历史即上下文
        const payload = history.map(item => {
            const next = { role: item.role, content: item.content };
            if (item._base64?.length) next.images = item._base64;
            return next;
        });

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            await streamChat({
                model,
                messages: payload,
                signal: controller.signal,
                onToken: chunk => {
                    full += chunk;
                    setMessages(prev => prev.map(item => (item.id === assistantMsg.id ? { ...item, content: full } : item)));
                }
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                full += `\n\n> ⚠️ 请求出错: ${err.message}\n> 请确认 Ollama 已启动 (\`ollama serve\`) 且模型已拉取.`;
                setMessages(prev => prev.map(item => (item.id === assistantMsg.id ? { ...item, content: full } : item)));
            }
        } finally {
            // 流式结束 (含中止/报错) 落库一次, 并刷新会话排序
            try {
                if (full) await addMessage({ ...assistantMsg, sessionId: sid, content: full });
                await updateSession(sid, {});
            } catch {
                /* ignore */
            }
            setSessions(prev => {
                const next = prev.map(item => (item.id === sid ? { ...item, updatedAt: Date.now() } : item));
                return next.sort((item1, item2) => (item2.updatedAt || 0) - (item1.updatedAt || 0));
            });
            setLoading(false);
            abortRef.current = null;
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
    };

    const empty = messages.length === 0;
    const activeTitle = sessions.find(item => item.id === activeId)?.title;

    return (
        <RunnerContext.Provider value={{ openRunner: files => setRunner({ files }) }}>
            <div className="flex h-screen bg-[#edf0f5]">
                <SessionList
                    sessions={sessions}
                    activeId={activeId}
                    disabled={loading}
                    onNew={newChat}
                    onSwitch={switchSession}
                    onDelete={handleDelete}
                    onRename={handleRename}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex items-center justify-between gap-4 border-b border-black/5 bg-white/80 px-6 py-3 backdrop-blur-md">
                        <Typography.Title
                            level={5}
                            style={{ margin: 0 }}
                            className="min-w-0 flex-1 truncate"
                            editable={{
                                onChange: value => handleRename(activeId, value),
                                tooltip: '重命名会话'
                            }}
                        >
                            {activeTitle || '新对话'}
                        </Typography.Title>
                        <div className="flex items-center gap-2">
                            <Select
                                value={model}
                                onChange={setModel}
                                variant="filled"
                                style={{ minWidth: 170 }}
                                disabled={loading}
                                options={MODELS.map(item => ({ value: item.id, label: item.name }))}
                            />
                            <button
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[15px] text-[#646a73] hover:bg-[#f2f3f5] hover:text-[#722ed1]"
                                onClick={() => setStorageOpen(true)}
                                title="会话存储管理"
                            >
                                <DatabaseOutlined />
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto py-6" ref={scrollRef} onScroll={handleScroll}>
                        <div className="mx-auto w-full max-w-[860px] px-5">
                            {empty ? (
                                <div className="mt-[12vh] text-center text-[#1f2329]">
                                    <div className="text-5xl">👋</div>
                                    <h1 className="my-4 mb-2 text-[26px] font-bold">你好, 我是本地大模型助手</h1>
                                    <p className="text-[15px] text-[#8a9099]">
                                        当前模型: {currentModel.name}
                                        {currentModel.vision ? '(支持图片理解)' : '(支持深度思考)'}
                                    </p>
                                </div>
                            ) : (
                                messages.map((item, index) => <MessageItem key={item.id} message={item} streaming={loading && index === messages.length - 1} />)
                            )}
                        </div>
                    </main>

                    <footer className="pt-2 pb-[18px]">
                        <div className="mx-auto w-full max-w-[860px] px-5">
                            <ChatInput onSend={handleSend} onStop={handleStop} loading={loading} allowImage={currentModel.vision} />
                        </div>
                    </footer>
                </div>
                <CodeRunner runner={runner} onClose={() => setRunner(null)} />
                <StorageModal open={storageOpen} onClose={() => setStorageOpen(false)} sessions={sessions} onDeleteMany={handleDeleteMany} />
            </div>
        </RunnerContext.Provider>
    );
};

export default App;
