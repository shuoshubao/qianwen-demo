import { BulbOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import Markdown from './Markdown';

const ReasoningPanel = ({ reasoning, thinking }) => {
    const [open, setOpen] = useState(true);
    if (!reasoning) return null;

    return (
        <div className="overflow-hidden rounded-xl border border-[#eceef1] bg-[#f6f7f9]">
            <button
                className="flex w-full cursor-pointer items-center gap-2 bg-transparent px-3.5 py-2.5 text-[13px] text-[#646a73]"
                onClick={() => setOpen(prev => !prev)}
            >
                <BulbOutlined />
                <span className="flex-1 text-left">{thinking ? '思考中…' : '已深度思考'}</span>
                {open ? <DownOutlined /> : <RightOutlined />}
            </button>
            {open && (
                <div className="border-t border-dashed border-[#e5e6eb] px-3.5 pt-1 pb-3 text-sm text-[#8a9099]">
                    <Markdown>{reasoning}</Markdown>
                </div>
            )}
        </div>
    );
};

export default ReasoningPanel;
