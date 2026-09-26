// 文件扩展名 → material-icon-theme 图标/类型名 (https://cdn.jsdelivr.net/npm/material-icon-theme)
const CDN = 'https://cdn.jsdelivr.net/npm/material-icon-theme/icons/';

const ICON_MAP = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    jsx: 'react',
    tsx: 'react',
    ts: 'typescript',
    mts: 'typescript',
    cts: 'typescript',
    dts: 'typescript-def',
    vue: 'vue',
    svelte: 'svelte',
    html: 'html',
    htm: 'html',
    css: 'css',
    less: 'less',
    scss: 'sass',
    sass: 'sass',
    md: 'markdown',
    markdown: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
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
    sql: 'database',
    db: 'database',
    graphql: 'graphql',
    gql: 'graphql',
    toml: 'toml',
    ini: 'settings',
    xml: 'xml',
    svg: 'svg',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    webp: 'image',
    bmp: 'image',
    ico: 'image',
    zip: 'zip',
    rar: 'zip',
    '7z': 'zip',
    gz: 'zip',
    tar: 'zip',
    pdf: 'pdf',
    txt: 'document',
    log: 'log',
    sh: 'console',
    bash: 'console',
    zsh: 'console',
    bat: 'console',
    ps1: 'powershell',
    lock: 'lock',
    env: 'settings',
    npmrc: 'npm'
};

// 无扩展名的常见文件名 (如 Makefile / LICENSE)
const NAME_MAP = {
    dockerfile: 'docker',
    makefile: 'makefile',
    license: 'license',
    readme: 'readme',
    gitignore: 'git'
};

const TYPE_MAP = {
    js: 'JavaScript',
    jsx: 'React',
    ts: 'TypeScript',
    tsx: 'React',
    vue: 'Vue',
    svelte: 'Svelte',
    html: 'HTML',
    css: 'CSS',
    less: 'Less',
    scss: 'Sass',
    sass: 'Sass',
    md: 'Markdown',
    markdown: 'Markdown',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    py: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    cs: 'C#',
    go: 'Go',
    rs: 'Rust',
    php: 'PHP',
    rb: 'Ruby',
    swift: 'Swift',
    kt: 'Kotlin',
    dart: 'Dart',
    scala: 'Scala',
    sql: 'SQL',
    graphql: 'GraphQL',
    toml: 'TOML',
    ini: 'INI',
    xml: 'XML',
    svg: 'SVG',
    png: 'PNG',
    jpg: 'JPG',
    jpeg: 'JPEG',
    gif: 'GIF',
    webp: 'WebP',
    bmp: 'BMP',
    zip: 'ZIP',
    rar: 'RAR',
    '7z': '7Z',
    gz: 'GZ',
    tar: 'TAR',
    pdf: 'PDF',
    txt: 'TXT',
    log: 'Log',
    sh: 'Shell',
    bat: 'BAT',
    ps1: 'PowerShell',
    lock: 'Lock',
    env: 'Env'
};

export const extOf = name => {
    const index = name.lastIndexOf('.');
    return index > 0 ? name.slice(index + 1).toLowerCase() : '';
};

export const getFileMeta = name => {
    const lower = (name || '').toLowerCase();
    const ext = extOf(lower);
    const icon = NAME_MAP[lower] || ICON_MAP[ext] || 'file';
    return { icon: `${CDN}${icon}.svg`, type: TYPE_MAP[ext] || '文件' };
};

// 790B / 1KB / 1.5MB
export const formatSize = bytes => {
    if (!bytes) {
        return '';
    }
    if (bytes < 1024) {
        return `${bytes}B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')}KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2).replace(/\.?0+$/, '')}MB`;
};
