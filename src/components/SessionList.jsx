import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, Empty, Input, Modal } from 'antd';
import { cn } from 'cn';
import { useState } from 'react';

const ChatIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.6221 1.01074C15.6967 1.11689 18.2352 2.0152 20.0479 3.61426C21.9946 5.33191 22.9999 7.76687 23 10.5898C23 13.4131 21.9948 15.8485 20.0479 17.5664C18.2352 19.1657 15.6968 20.0638 12.6221 20.1699L12 20.1807C11.6004 20.1807 11.2109 20.1656 10.833 20.1396C9.3356 21.3407 7.52211 22.3818 4.49902 22.9932C4.13876 23.066 3.76741 22.9347 3.53223 22.6523C3.2971 22.3695 3.23551 21.9798 3.37305 21.6387C4.05873 19.9385 4.45874 18.9388 4.54492 18.042C2.22418 16.3265 1 13.7033 1 10.5898C1.00012 7.76654 2.00499 5.33099 3.95215 3.61328C5.88575 1.90775 8.64483 1 12 1L12.6221 1.01074ZM12 3C8.99225 3 6.75086 3.8119 5.27539 5.11328C3.81347 6.40293 3.00011 8.26296 3 10.5898C3 13.3048 4.1067 15.3986 6.10449 16.6904C6.37958 16.8685 6.54991 17.1705 6.56055 17.498C6.59325 18.5067 6.33569 19.483 5.94824 20.5498C7.70416 19.9733 8.8484 19.2022 9.86816 18.3457L9.94824 18.2852C10.1393 18.1549 10.3712 18.0939 10.6035 18.1152C11.0532 18.1566 11.5192 18.1807 12 18.1807L12.5547 18.1709C15.2847 18.0768 17.3413 17.2868 18.7246 16.0664C20.1864 14.7765 21 12.9166 21 10.5898C20.9999 8.26321 20.1864 6.40294 18.7246 5.11328C17.3414 3.89313 15.2845 3.10383 12.5547 3.00977L12 3Z"
        />
    </svg>
);

const SessionList = ({ sessions, activeId, disabled, onNew, onSwitch, onDelete, onRename }) => {
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');

    const startEdit = item => {
        setEditingId(item.id);
        setDraft(item.title || '');
        setError('');
    };

    const commitEdit = () => {
        const text = draft.trim();
        if (!text) {
            setError('名称不能为空');
            return;
        }
        if (text.length < 4 || text.length > 20) {
            setError('名称长度需为 4-20 个字符');
            return;
        }
        onRename(editingId, text);
        setEditingId(null);
    };

    // 删除确认走 Modal.confirm: Dropdown 菜单项内不适合嵌 Popconfirm
    const confirmDelete = item => {
        Modal.confirm({
            title: '删除该会话?',
            content: '会话内容将一并清除, 不可恢复',
            okText: '删除',
            cancelText: '取消',
            okButtonProps: { danger: true },
            onOk: () => onDelete(item.id)
        });
    };

    return (
        <aside className="flex h-full w-[250px] flex-shrink-0 flex-col border-r border-black/5 bg-[#f7f8fa]">
            <div className="p-3 pb-2">
                <div
                    className={cn(
                        'flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] text-[#1f2329] transition-colors',
                        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#eef0f4]'
                    )}
                    onClick={() => {
                        if (!disabled) {
                            onNew();
                        }
                    }}
                >
                    <ChatIcon className="h-[18px] w-[18px]" /> 新对话
                </div>
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
                            <div className={cn('truncate text-[13px]', item.id === activeId ? 'text-[#722ed1]' : 'text-[#1f2329]')}>
                                {item.title || '新对话'}
                            </div>
                        </div>

                        <Dropdown
                            trigger={['click']}
                            menu={{
                                items: [
                                    { key: 'rename', label: '重命名', icon: <EditOutlined /> },
                                    { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true }
                                ],
                                onClick: ({ key, domEvent }) => {
                                    domEvent.stopPropagation();
                                    if (key === 'rename') {
                                        startEdit(item);
                                    }
                                    if (key === 'delete') {
                                        confirmDelete(item);
                                    }
                                }
                            }}
                        >
                            <Button
                                type="text"
                                icon={<MoreOutlined />}
                                onClick={e => e.stopPropagation()}
                                title="更多操作"
                                className="ml-1! text-[#8a9099]! opacity-0 transition-opacity group-hover:opacity-100! hover:text-[#1f2329]!"
                            />
                        </Dropdown>
                    </div>
                ))}
                {sessions.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无历史会话" className="py-6" />}
            </div>

            <Modal title="重命名会话" open={!!editingId} onOk={commitEdit} onCancel={() => setEditingId(null)} okText="确定" cancelText="取消" width={360}>
                <Input
                    autoFocus
                    value={draft}
                    maxLength={20}
                    showCount
                    status={error ? 'error' : ''}
                    placeholder="输入新名称 (5-20 个字符)"
                    onChange={e => {
                        setDraft(e.target.value);
                        if (error) {
                            setError('');
                        }
                    }}
                    onPressEnter={commitEdit}
                />
                {error && <div className="mt-1.5 text-xs text-[#f53f3f]">{error}</div>}
            </Modal>
        </aside>
    );
};

export default SessionList;
