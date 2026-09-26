import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Popconfirm } from 'antd';
import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';

// 会话时间展示: 今天显示时分, 昨天/今年内/更早依次降级
const formatTime = ts => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (d.getTime() >= startOfToday) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }
    if (d.getTime() >= startOfToday - 86400000) return '昨天';
    if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日`;
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

const SessionList = ({ sessions, activeId, disabled, onNew, onSwitch, onDelete, onRename }) => {
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (editingId) inputRef.current?.select();
    }, [editingId]);

    const startEdit = item => {
        setEditingId(item.id);
        setDraft(item.title || '');
    };

    const commitEdit = () => {
        if (editingId && draft.trim()) onRename(editingId, draft.trim());
        setEditingId(null);
    };

    return (
        <aside className="flex w-[250px] flex-shrink-0 flex-col border-r border-black/5 bg-[#f7f8fa]">
            <div className="p-3 pb-2">
                <button
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#722ed1] py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={onNew}
                    disabled={disabled}
                >
                    <PlusOutlined /> 新建对话
                </button>
            </div>

            <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
                {sessions.map(item => (
                    <div
                        key={item.id}
                        className={cn(
                            'group relative flex cursor-pointer items-center rounded-[10px] px-3 py-2.5 transition-colors',
                            item.id === activeId ? 'bg-[#ece9f8]' : 'hover:bg-[#eef0f4]'
                        )}
                        onClick={() => !disabled && onSwitch(item.id)}
                    >
                        <div className="min-w-0 flex-1">
                            {editingId === item.id ? (
                                <input
                                    ref={inputRef}
                                    className="w-full rounded border border-[#722ed1] bg-white px-1.5 py-0.5 text-[13px] text-[#1f2329] outline-none"
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') commitEdit();
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <div className={cn('truncate text-[13px]', item.id === activeId ? 'text-[#722ed1]' : 'text-[#1f2329]')}>
                                    {item.title || '新对话'}
                                </div>
                            )}
                            {editingId !== item.id && <div className="mt-0.5 text-xs text-[#a8adb5]">{formatTime(item.updatedAt)}</div>}
                        </div>

                        {editingId !== item.id && (
                            <div
                                className="absolute right-1.5 flex items-center gap-0.5 rounded-md bg-white/90 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    className="cursor-pointer rounded p-1 text-xs text-[#8a9099] hover:bg-[#f2f3f5] hover:text-[#3370ff]"
                                    title="重命名"
                                    onClick={() => startEdit(item)}
                                >
                                    <EditOutlined />
                                </button>
                                <Popconfirm
                                    title="删除该会话?"
                                    description="会话内容将一并清除, 不可恢复"
                                    okText="删除"
                                    cancelText="取消"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => onDelete(item.id)}
                                >
                                    <button className="cursor-pointer rounded p-1 text-xs text-[#8a9099] hover:bg-[#f2f3f5] hover:text-[#f53f3f]" title="删除">
                                        <DeleteOutlined />
                                    </button>
                                </Popconfirm>
                            </div>
                        )}
                    </div>
                ))}
                {sessions.length === 0 && <div className="px-3 py-6 text-center text-xs text-[#a8adb5]">暂无历史会话</div>}
            </div>
        </aside>
    );
};

export default SessionList;
