import { Button, Modal, Popconfirm, Space, Table } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { getSessionStats } from '../db';

// 字节数格式化: B / KB / MB
const formatSize = bytes => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const formatTime = ts => {
    if (!ts) {
        return '-';
    }
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 会话存储管理弹窗: 展示各会话在 IndexedDB 中的占用, 支持单删与批量删除
const StorageModal = ({ open, onClose, sessions, onDeleteMany }) => {
    const [stats, setStats] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setStats(await getSessionStats());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setSelectedIds([]);
            load();
        }
    }, [open]);

    // 以 sessions 为准 (含无消息的空会话), 合并统计结果
    const rows = useMemo(() => {
        const statMap = new Map(stats.map(item => [item.id, item]));
        return sessions.map(item => {
            const stat = statMap.get(item.id) || { count: 0, size: 0 };
            return { ...item, ...stat };
        });
    }, [sessions, stats]);

    const totalSize = rows.reduce((sum, item) => sum + item.size, 0);

    const remove = async ids => {
        const ok = await onDeleteMany(ids);
        if (ok) {
            setSelectedIds(prev => prev.filter(item => !ids.includes(item)));
            load();
        }
    };

    const columns = [
        { title: '会话', dataIndex: 'title', ellipsis: true, render: value => value || '新对话' },
        { title: '消息数', dataIndex: 'count', width: 80, align: 'center' },
        { title: '占用空间', dataIndex: 'size', width: 100, align: 'right', render: formatSize },
        { title: '创建时间', dataIndex: 'createdAt', width: 145, render: formatTime },
        { title: '更新时间', dataIndex: 'updatedAt', width: 145, render: formatTime },
        {
            title: '操作',
            width: 70,
            align: 'center',
            render: (value, record) => (
                <Popconfirm
                    title="删除该会话?"
                    description="会话内容将一并清除, 不可恢复"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => remove([record.id])}
                >
                    <Button size="small" danger type="text">
                        删除
                    </Button>
                </Popconfirm>
            )
        }
    ];

    return (
        <Modal
            title="会话存储管理"
            open={open}
            onCancel={onClose}
            width={860}
            footer={
                <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8a9099]">
                        共 {rows.length} 个会话, 总计占用 {formatSize(totalSize)}
                    </span>
                    <Space size={8} align="center">
                        <Popconfirm
                            title={`删除选中的 ${selectedIds.length} 个会话?`}
                            description="会话内容将一并清除, 不可恢复"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            disabled={selectedIds.length === 0}
                            onConfirm={() => remove(selectedIds)}
                        >
                            <Button danger disabled={selectedIds.length === 0}>
                                批量删除 ({selectedIds.length})
                            </Button>
                        </Popconfirm>
                        <Button onClick={onClose}>关闭</Button>
                    </Space>
                </div>
            }
        >
            <Table
                rowKey="id"
                size="small"
                loading={loading}
                dataSource={rows}
                columns={columns}
                pagination={false}
                rowSelection={{
                    selectedRowKeys: selectedIds,
                    onChange: keys => setSelectedIds(keys)
                }}
            />
        </Modal>
    );
};

export default StorageModal;
