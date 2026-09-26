import { visit } from 'unist-util-visit';

/**
 * rehype 预处理插件: 把 className 中的 "language-html:index.html" 拆成
 * "language-html" + node.properties.dataFilename, 避免 rehype-highlight
 * 因未知语言名抛错 (必须先于 rehypeHighlight 注册).
 */
export const rehypeFileNames = () => tree => {
    visit(tree, 'element', node => {
        const classes = node.properties?.className;
        if (!Array.isArray(classes)) return;
        node.properties.className = classes.map(item => {
            if (typeof item !== 'string') return item;
            const match = /^language-([\w-]+):(.+)$/.exec(item);
            if (match) {
                node.properties.dataFilename = match[2];
                return `language-${match[1]}`;
            }
            return item;
        });
    });
};