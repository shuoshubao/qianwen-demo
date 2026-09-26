import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react(), tailwindcss(), visualizer({ filename: 'stats.json', gzipSize: true, json: true })],
    build: {
        // react / react-dom / antd / lodash 由 index.html 的 importmap 指向 esm.sh, 不进包; @ant-design/icons 由 vite 打包
        rollupOptions: {
            external: ['react', 'react-dom', 'react-dom/client', 'antd', 'lodash']
        }
    },
    server: {
        watch: {}
    }
});
