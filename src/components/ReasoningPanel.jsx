import { BulbOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import Markdown from './Markdown';

const ReasoningPanel = ({ reasoning, thinking }) => {
    const [open, setOpen] = useState(true);
    if (!reasoning) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-xl border border-[#eceef1] bg-[#f6f7f9]">
            <Button
                type="text"
                onClick={() => setOpen(prev => !prev)}
                className="w-full! justify-start! rounded-none! bg-transparent! px-3.5! py-2.5! text-[13px]! text-[#646a73]! hover:bg-transparent!"
            >
                <BulbOutlined />
                <span className="flex-1 text-left">{thinking ? '思考中…' : '已深度思考'}</span>
                {open ? <DownOutlined /> : <RightOutlined />}
            </Button>
            {open && (
                <div className="border-t border-dashed border-[#e5e6eb] px-3.5 pt-1 pb-3 text-sm text-[#8a9099]">
                    <Markdown>{reasoning}</Markdown>
                </div>
            )}
        </div>
    );
};

export default ReasoningPanel;
