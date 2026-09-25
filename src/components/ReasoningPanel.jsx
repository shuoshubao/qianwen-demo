import { useState } from 'react';
import { DownOutlined, RightOutlined, BulbOutlined } from '@ant-design/icons';
import Markdown from './Markdown';

export default function ReasoningPanel({ reasoning, thinking }) {
    const [open, setOpen] = useState(true);
    if (!reasoning) return null;

    return (
        <div className="reasoning-panel">
            <button className="reasoning-head" onClick={() => setOpen(v => !v)}>
                <BulbOutlined />
                <span>{thinking ? '思考中…' : '已深度思考'}</span>
                {open ? <DownOutlined /> : <RightOutlined />}
            </button>
            {open && (
                <div className="reasoning-body">
                    <Markdown>{reasoning}</Markdown>
                </div>
            )}
        </div>
    );
}
