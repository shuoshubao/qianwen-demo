import { DatabaseOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Typography } from 'antd';
import { find, orderBy, reject } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MODELS, streamChat } from './api/ollama';
import ChatInput from './components/ChatInput';
import CodeRunner from './components/CodeRunner';
import FilePreview from './components/FilePreview';
import MessageItem from './components/MessageItem';
import SessionList from './components/SessionList';
import StorageModal from './components/StorageModal';
import { addMessage, createSession, deleteMessages, deleteSession, getSession, listMessages, listSessions, updateSession } from './db';
import { RunnerContext } from './runnerContext';
import { extOf } from './utils/fileMeta';

let idSeq = 0;
const nextId = () => `m_${Date.now()}_${idSeq++}`;

const SidebarIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.416 2.00098C7.82588 2.00992 6.39937 2.08214 5.27637 2.6543C4.14739 3.22954 3.22954 4.14739 2.6543 5.27637C2.00042 6.55977 2 8.23965 2 11.5996V12.4004L2.00098 13.584C2.00992 16.1741 2.08214 17.6006 2.6543 18.7236C3.22954 19.8526 4.14739 20.7705 5.27637 21.3457C6.39937 21.9179 7.82588 21.9901 10.416 21.999L11.5996 22H12.4004C15.5506 22 17.2241 21.9999 18.4785 21.4609L18.7236 21.3457C19.7819 20.8065 20.6554 19.9667 21.2344 18.9336L21.3457 18.7236C21.9179 17.6006 21.9901 16.1741 21.999 13.584L22 12.4004V11.5996C22 8.44937 21.9999 6.7759 21.4609 5.52148L21.3457 5.27637C20.8065 4.21805 19.9667 3.34459 18.9336 2.76562L18.7236 2.6543C17.4402 2.00042 15.7603 2 12.4004 2H11.5996L10.416 2.00098ZM12.4004 4C14.1132 4 15.2776 4.00167 16.1777 4.0752C17.0546 4.14684 17.5036 4.27617 17.8164 4.43555C18.5689 4.81902 19.181 5.43109 19.5645 6.18359C19.7238 6.49639 19.8532 6.94544 19.9248 7.82227C19.9983 8.72235 20 9.88678 20 11.5996V12.4004C20 14.1132 19.9983 15.2776 19.9248 16.1777C19.8532 17.0546 19.7238 17.5036 19.9248 17.8164C19.181 18.5689 18.5689 19.181 17.8164 19.5645C17.5036 19.7238 17.0546 19.8532 16.1777 19.9248C15.2776 19.9983 14.1132 20 12.4004 20H11.5996C11.0041 20 10.4749 19.9985 10 19.9951V4.00391C10.4749 4.00055 11.0041 4 11.5996 4H12.4004ZM8 19.9365C7.93964 19.9324 7.88035 19.9296 7.82227 19.9248C6.94543 19.8532 6.49639 19.7238 6.18359 19.5645C5.43109 19.181 4.81902 18.5689 4.43555 17.8164C4.27617 17.5036 4.14684 17.0546 4.0752 16.1777C4.00167 15.2776 4 14.1132 4 12.4004V11.5996C4 9.88678 4.00167 8.72235 4.0752 7.82227C4.14684 6.94544 4.27617 6.49639 4.43555 6.18359C4.81902 5.43109 5.43109 4.81902 6.18359 4.43555C6.49639 4.27617 6.94543 4.14684 7.82227 4.0752C7.88037 4.07045 7.93962 4.06667 8 4.0625V19.9365Z" />
    </svg>
);

const App = () => {
    const [model, setModel] = useState(MODELS[0].id);
    const [sessions, setSessions] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [runner, setRunner] = useState(null); // { code, lang } | null
    const [previewFile, setPreviewFile] = useState(null); // { name, size, content } | null
    const [storageOpen, setStorageOpen] = useState(false);
    const [bulkMode, setBulkMode] = useState(false); // 批量删除模式
    const [selected, setSelected] = useState(() => new Set()); // 选中的消息 id 集合
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1');
    const abortRef = useRef(null);
    const scrollRef = useRef(null);
    const stickToBottomRef = useRef(true); // 用户是否停留在底部, 上滚看历史时暂停自动滚动

    const currentModel = useMemo(() => find(MODELS, { id: model }), [model]);

    // 挂载前抓取 URL 中的会话 id 留快照 (同步 effect 会改写 URL)
    const initialSessionIdRef = useRef(new URL(window.location.href).searchParams.get('session'));

    // 启动时按 URL 恢复会话, 无参数 (新对话页) 则停留空白页
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const list = await listSessions();
            if (cancelled) {
                return;
            }
            setSessions(list);
            const target = find(list, { id: initialSessionIdRef.current });
            if (target) {
                setActiveId(target.id);
                if (target.model) {
                    setModel(target.model);
                }
                const msgs = await listMessages(target.id);
                if (!cancelled) {
                    setMessages(msgs);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // 会话与 URL 同步: 切到哪个会话就记录到 ?session=, 刷新后可恢复
    useEffect(() => {
        const url = new URL(window.location.href);
        if (activeId) {
            url.searchParams.set('session', activeId);
        } else {
            url.searchParams.delete('session');
        }
        window.history.replaceState(null, '', url);
    }, [activeId]);

    // 距底部 40px 以内视为贴底, 恢复自动滚动
    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) {
            return;
        }
        stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el && stickToBottomRef.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages]);

    const switchSession = async id => {
        if (loading || id === activeId) {
            return;
        }
        try {
            const session = await getSession(id);
            const msgs = await listMessages(id);
            setActiveId(id);
            if (session?.model) {
                setModel(session.model);
            }
            setMessages(msgs);
            stickToBottomRef.current = true;
            setRunner(null); // 切会话时关闭预览模块
            setPreviewFile(null);
        } catch {
            /* ignore */
        }
    };

    const newChat = () => {
        if (loading) {
            return;
        }
        setActiveId(null);
        setMessages([]);
        stickToBottomRef.current = true;
    };

    const handleDeleteMany = async ids => {
        if (loading || ids.length === 0) {
            return false;
        }
        try {
            for (const item of ids) await deleteSession(item);
            const rest = reject(sessions, item => ids.includes(item.id));
            setSessions(rest);
            if (ids.includes(activeId)) {
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
        const t = (title ?? '').trim();
        if (!id || !t) {
            return;
        }
        updateSession(id, { title: t });
        setSessions(prev => prev.map(item => (item.id === id ? { ...item, title: t } : item)));
    };

    const handleSend = async (text, attachments = []) => {
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
            // 唯一数据源: 按选择顺序存附件, 图片存 data URL (展示与模型输入共用)
            attachments: attachments.map(item =>
                item.kind === 'image'
                    ? { kind: 'image', data: `data:image/*;base64,${item.base64}` }
                    : { kind: 'file', name: item.name, size: item.size, content: item.content }
            ),
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
                const hasImage = attachments.some(item => item.kind === 'image');
                const hasFile = attachments.some(item => item.kind === 'file');
                const title = text.trim() ? text.trim().slice(0, 20) : hasImage ? '[图片]' : hasFile ? '[文件]' : '新对话';
                await updateSession(sid, { title });
                setSessions(prev => prev.map(item => (item.id === sid ? { ...item, title } : item)));
            }
            await addMessage({ ...userMsg, sessionId: sid });
        } catch {
            /* 存储失败不阻断对话 */
        }

        // 组装发给 Ollama 的消息: 图片 base64 走 images 字段, 文件以 [文件: name] + 代码块拼进 content
        const payload = history.map(item => {
            const next = { role: item.role, content: item.content };
            const imgs = (item.attachments ?? []).filter(a => a.kind === 'image');
            const files = (item.attachments ?? []).filter(a => a.kind === 'file');
            if (imgs.length > 0) {
                next.images = imgs.map(a => String(a.data).split(',')[1]);
            }
            if (files.length > 0) {
                const blocks = files.map(f => `[文件: ${f.name}]\n\`\`\`${extOf(f.name)}\n${f.content}\n\`\`\``);
                next.content = `${next.content}\n\n${blocks.join('\n\n')}`;
            }
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
                if (full) {
                    await addMessage({ ...assistantMsg, sessionId: sid, content: full });
                }
                await updateSession(sid, {});
            } catch {
                /* ignore */
            }
            setSessions(prev =>
                orderBy(
                    prev.map(item => (item.id === sid ? { ...item, updatedAt: Date.now() } : item)),
                    item => item.updatedAt ?? 0,
                    'desc'
                )
            );
            setLoading(false);
            abortRef.current = null;
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
    };

    // 模型与会话绑定: 切换即落库, 切回该会话时按存储回显, 不随全局默认值漂移
    const handleModelChange = value => {
        setModel(value);
        if (activeId) {
            updateSession(activeId, { model: value });
            setSessions(prev => prev.map(item => (item.id === activeId ? { ...item, model: value } : item)));
        }
    };

    // 稳定引用, 避免每次渲染新建函数导致 MessageItem 的 memo 失效
    const enterBulkMode = useCallback(
        id => {
            if (loading) {
                return;
            }
            setBulkMode(true);
            // 从哪条消息进入就默认选中哪条
            setSelected(new Set([id]));
        },
        [loading]
    );

    const exitBulkMode = useCallback(() => {
        setBulkMode(false);
        setSelected(new Set());
    }, []);

    // 批量模式下按 Esc 退出
    useEffect(() => {
        if (!bulkMode) {
            return;
        }
        const onKeyDown = e => {
            if (e.key === 'Escape') {
                exitBulkMode();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [bulkMode]);

    const toggleSelect = useCallback(id => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const confirmDeleteSelected = () => {
        if (selected.size === 0) {
            return;
        }
        Modal.confirm({
            title: selected.size === 1 ? '是否删除该条消息？' : `是否删除选中的 ${selected.size} 条消息？`,
            content: '删除后，聊天记录不可恢复，对话内的文件也将被彻底删除',
            okText: '删除',
            okButtonProps: { danger: true },
            cancelText: '取消',
            onOk: async () => {
                await deleteMessages(Array.from(selected));
                setMessages(prev => prev.filter(item => !selected.has(item.id)));
                setBulkMode(false);
                setSelected(new Set());
            }
        });
    };

    const toggleSidebar = () => {
        const next = !sidebarCollapsed;
        localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
        setSidebarCollapsed(next);
    };

    const empty = messages.length === 0;
    const activeTitle = find(sessions, { id: activeId })?.title;

    // 稳定引用: 避免 App 重渲染穿透 MessageItem 的 memo, 导致历史 Monaco 代码块反复闪烁
    const runnerCtx = useMemo(
        () => ({
            openRunner: files => setRunner({ files }),
            openFile: file => setPreviewFile(file)
        }),
        []
    );

    return (
        <RunnerContext.Provider value={runnerCtx}>
            <div className="flex h-screen bg-white">
                <div className="flex-shrink-0 overflow-hidden transition-[width] duration-200" style={{ width: sidebarCollapsed ? 0 : 250 }}>
                    <SessionList
                        sessions={sessions}
                        activeId={activeId}
                        disabled={loading}
                        onNew={newChat}
                        onSwitch={switchSession}
                        onDelete={handleDelete}
                        onRename={handleRename}
                    />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex items-center justify-between gap-4 border-b border-black/5 bg-white/80 px-6 py-3 backdrop-blur-md">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            <Button
                                type="text"
                                icon={<SidebarIcon className="h-[18px] w-[18px]" />}
                                onClick={toggleSidebar}
                                title={sidebarCollapsed ? '展开会话列表' : '收起会话列表'}
                                className="h-8! w-8! text-[#646a73]! hover:text-[#722ed1]!"
                            />
                            {bulkMode ? (
                                <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-[#1f2329]">选择对话</span>
                            ) : (
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
                            )}
                        </div>
                        <Space size={8} align="center">
                            {bulkMode ? (
                                <Button type="text" onClick={exitBulkMode} className="px-3! py-1.5! text-[14px]! text-[#646a73]!">
                                    取消
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        type="text"
                                        icon={<DatabaseOutlined />}
                                        onClick={() => setStorageOpen(true)}
                                        title="会话存储管理"
                                        className="h-8! w-8! text-[#646a73]! hover:text-[#722ed1]!"
                                    />
                                </>
                            )}
                        </Space>
                    </header>

                    <main className="flex-1 overflow-y-auto py-6" ref={scrollRef} onScroll={handleScroll}>
                        <div className={`mx-auto flex w-full max-w-[860px] flex-col px-5 ${bulkMode ? 'gap-1' : 'gap-6'}`}>
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
                                messages.map((item, index) => (
                                    <MessageItem
                                        key={item.id}
                                        message={item}
                                        streaming={loading && index === messages.length - 1}
                                        bulkMode={bulkMode}
                                        checked={selected.has(item.id)}
                                        onToggleSelect={toggleSelect}
                                        onDelete={enterBulkMode}
                                        disabled={loading}
                                    />
                                ))
                            )}
                        </div>
                    </main>

                    <footer className="pt-2 pb-[18px]">
                        <div className={`mx-auto w-full max-w-[860px] px-5 ${bulkMode ? 'pointer-events-none opacity-40' : ''}`}>
                            <ChatInput
                                onSend={handleSend}
                                onStop={handleStop}
                                loading={loading}
                                allowImage={currentModel.vision}
                                model={model}
                                onModelChange={handleModelChange}
                            />
                        </div>
                    </footer>
                    {bulkMode && (
                        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-end border-t border-[#e5e6eb] bg-white/95 py-3 pr-6 backdrop-blur">
                            <Button type="primary" danger shape="round" disabled={selected.size === 0} onClick={confirmDeleteSelected} className="px-12!">
                                删除
                            </Button>
                        </div>
                    )}
                </div>
                <CodeRunner runner={runner} onClose={() => setRunner(null)} />
                <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
                <StorageModal open={storageOpen} onClose={() => setStorageOpen(false)} sessions={sessions} onDeleteMany={handleDeleteMany} />
            </div>
        </RunnerContext.Provider>
    );
};

export default App;
