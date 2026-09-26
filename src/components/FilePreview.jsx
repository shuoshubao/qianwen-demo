import { CloseOutlined } from '@ant-design/icons';
import { extOf, formatSize, getFileMeta } from '../utils/fileMeta';
import MonacoEditor from './MonacoEditor';

// 扩展名 → Monaco 语言
const LANG_OF = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    mts: 'typescript',
    cts: 'typescript',
    tsx: 'typescript',
    dts: 'typescript',
    vue: 'vue',
    svelte: 'svelte',
    html: 'html',
    htm: 'html',
    css: 'css',
    less: 'less',
    scss: 'scss',
    sass: 'scss',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'ini',
    ini: 'ini',
    xml: 'xml',
    svg: 'xml',
    md: 'markdown',
    markdown: 'markdown',
    txt: 'plaintext',
    log: 'plaintext',
    py: 'python',
    java: 'java',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    dart: 'dart',
    scala: 'scala',
    sql: 'sql',
    graphql: 'graphql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    bat: 'bat',
    ps1: 'powershell'
};

// 纯文件代码预览: 标题栏 + 只读编辑器, 无运行/下载/模式切换
const FilePreview = ({ file, onClose }) => {
    if (!file) {
        return null;
    }
    const meta = getFileMeta(file.name);
    return (
        <aside className="relative flex h-full w-[520px] flex-shrink-0 flex-col border-l border-[#e5e6eb] bg-white [animation:runner-slide_0.25s_ease]">
            <header className="flex flex-shrink-0 items-center gap-3 border-b border-[#eceef1] px-4 py-3">
                <img src={meta.icon} alt="" className="h-6 w-6 flex-shrink-0" />
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-semibold text-[#1f2329]">{file.name}</span>
                    <span className="text-xs text-[#8a9099]">
                        {meta.type} · {formatSize(file.size)}
                    </span>
                </div>
                <button
                    className="ml-auto flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-base text-[#8a9099] hover:bg-[#f2f3f5] hover:text-[#1f2329]"
                    onClick={onClose}
                    title="关闭"
                >
                    <CloseOutlined />
                </button>
            </header>
            <div className="min-h-0 flex-1 p-2">
                <MonacoEditor value={file.content} language={LANG_OF[extOf(file.name)] || 'plaintext'} readOnly />
            </div>
        </aside>
    );
};

export default FilePreview;
