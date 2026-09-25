import { CloseOutlined, CodeOutlined, EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import './CodeRunner.scss';
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
        <div className="runner-mask" onClick={onClose}>
            <aside className="runner-panel" onClick={e => e.stopPropagation()}>
                <header className="runner-head">
                    <div className="runner-title">
                        <span className="runner-dot" />
                        代码运行
                        <span className="runner-lang">{runner.lang}</span>
                    </div>
                    <div className="runner-tabs">
                        <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
                            <EyeOutlined /> 预览
                        </button>
                        <button className={tab === 'source' ? 'active' : ''} onClick={() => setTab('source')}>
                            <CodeOutlined /> 源码
                        </button>
                    </div>
                    <button className="runner-close" onClick={onClose} title="关闭">
                        <CloseOutlined />
                    </button>
                </header>

                <div className="runner-content">
                    {tab === 'preview' ? (
                        <div className="runner-preview">
                            <iframe key={runId} srcDoc={html} sandbox="allow-scripts" title="代码预览" />
                        </div>
                    ) : (
                        <div className="runner-source">
                            <MonacoEditor value={code} language={lastLangRef.current} onChange={setCode} />
                        </div>
                    )}
                </div>

                <footer className="runner-foot">
                    <button
                        className="runner-run"
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
