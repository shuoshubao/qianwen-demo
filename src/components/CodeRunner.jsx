import { CloseOutlined, CodeOutlined, EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import MonacoEditor from './MonacoEditor';

// 与 Markdown.jsx 中 RUNNABLE_LANGS 保持一致
const LANG_MAP = {
    html: 'html',
    xml: 'html',
    svg: 'html',
    css: 'css',
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    json: 'json'
};

// iframe 内注入错误捕获，把 JS 报错显示在预览页顶部
const ERROR_GUARD = `<script>
window.addEventListener('error', function (e) {
    var el = document.getElementById('__error__') || (function () {
        var d = document.createElement('div');
        d.id = '__error__';
        d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#fff1f0;color:#cf1322;padding:8px 12px;font:12px/1.5 monospace;border-bottom:1px solid #ffa39e;white-space:pre-wrap;';
        (document.body || document.documentElement).appendChild(d);
        return d;
    })();
    el.textContent = 'Error: ' + e.message;
});
</script>`;

/** 按语言把代码组装成可预览的完整 HTML */
function buildHtml(code, lang) {
    if (lang === 'html' || lang === 'xml' || lang === 'svg') {
        return code;
    }
    const style = lang === 'css' ? `<style>\n${code}\n</style>` : '';
    const script = lang === 'css' ? '' : `<script>\n${code}\n</script>`;
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>预览</title>
${style}
</head>
<body>
${script}
${ERROR_GUARD}
</body>
</html>`;
}

export default function CodeRunner({ runner, onClose }) {
    const [tab, setTab] = useState('preview'); // preview | source
    const [code, setCode] = useState('');
    const [runId, setRunId] = useState(0);
    const lastLangRef = useRef('html');

    const lang = runner ? LANG_MAP[runner.lang] || 'html' : 'html';

    // 每次从代码块打开时重置
    useEffect(() => {
        if (runner) {
            const mapped = LANG_MAP[runner.lang] || 'html';
            lastLangRef.current = mapped;
            setTab('preview');
            setCode(runner.code);
            setRunId(n => n + 1);
        }
    }, [runner]);

    const html = useMemo(() => buildHtml(code, lang), [code, lang]);

    if (!runner) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-[rgba(15,20,30,0.25)] [animation:runner-fade_0.2s_ease]" onClick={onClose}>
            <aside
                className="flex h-full w-[min(600px,92vw)] flex-col bg-white shadow-[-8px_0_32px_rgba(15,20,30,0.12)] [animation:runner-slide_0.25s_ease]"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex flex-shrink-0 items-center gap-4 border-b border-[#eceef1] px-4 py-3">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1f2329]">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        代码运行
                        <span className="rounded-[10px] bg-[rgba(114,46,209,0.08)] px-2 py-0.5 text-xs font-medium text-[#722ed1] uppercase">
                            {runner.lang}
                        </span>
                    </div>
                    <div className="ml-auto flex gap-1 rounded-[10px] bg-[#f2f3f5] p-[3px]">
                        <button
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-3.5 py-[5px] text-[13px] text-[#646a73] transition-all ${tab === 'preview' ? 'bg-white font-semibold text-[#722ed1] shadow-[0_1px_4px_rgba(15,20,30,0.08)]' : ''}`}
                            onClick={() => setTab('preview')}
                        >
                            <EyeOutlined /> 预览
                        </button>
                        <button
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-3.5 py-[5px] text-[13px] text-[#646a73] transition-all ${tab === 'source' ? 'bg-white font-semibold text-[#722ed1] shadow-[0_1px_4px_rgba(15,20,30,0.08)]' : ''}`}
                            onClick={() => setTab('source')}
                        >
                            <CodeOutlined /> 源码
                        </button>
                    </div>
                    <button
                        className="cursor-pointer rounded-lg p-1.5 text-base leading-none text-[#8a9099] hover:bg-[#f2f3f5] hover:text-[#1f2329]"
                        onClick={onClose}
                        title="关闭"
                    >
                        <CloseOutlined />
                    </button>
                </header>

                <div className="min-h-0 flex-1">
                    {tab === 'preview' ? (
                        <div className="h-full">
                            <iframe key={runId} srcDoc={html} sandbox="allow-scripts" title="代码预览" className="h-full w-full border-0 bg-white" />
                        </div>
                    ) : (
                        <div className="h-full p-2">
                            <MonacoEditor value={code} language={lastLangRef.current} onChange={setCode} />
                        </div>
                    )}
                </div>

                <footer className="flex flex-shrink-0 justify-end border-t border-[#eceef1] px-4 py-2.5">
                    <button
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[18px] bg-gradient-to-br from-[#722ed1] to-[#9254de] px-5 py-2 text-sm text-white transition-opacity hover:opacity-90"
                        onClick={() => {
                            setTab('preview');
                            setRunId(n => n + 1);
                        }}
                    >
                        <PlayCircleOutlined /> 重新运行
                    </button>
                </footer>
            </aside>
        </div>
    );
}
