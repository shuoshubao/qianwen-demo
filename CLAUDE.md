# qianwen-demo 开发规范

本文件是项目的开发规范与约定, Comate / Claude Code 等 AI 编程助手会自动读取并遵守, 请所有开发同学保持一致。

## 代码风格

### 标点规范

-   代码注释中的标点一律使用英文半角 (`,`, `.`, `:`, `;`, `(`, `)`, `[`, `]` 等), 禁止出现中文全角标点 (`,`, `。`, `：`, `；`, `（`, `）`, `、` 等)
-   注释内容用中文, 标点用英文, 例如: 写 `// 将消息写入数据库, 异常时忽略` 而不要写 `// 将消息写入数据库，异常时忽略`

### 变量命名

-   数组遍历 (map / filter / find / forEach / sort 等) 的回调参数统一命名为 `item` / `index`, 嵌套遍历依次加数字后缀: `item1`, `item2`, `index1`, `index2`
-   禁止使用无意义的单字母变量名 (`a`, `b`, `m`, `s`, `i`, `v` 等)
-   语义化命名, 不要缩写

### 语法要求

-   使用最新 JavaScript 语法 (ES2022+): 箭头函数、可选链 `?.`、空值合并 `??`、解构、展开运算符、`crypto.randomUUID()` 等
-   函数统一使用 `const fn = () => {}` 箭头函数形式, 不使用 `function` 声明 (包括 React 组件)
-   不使用 `var`, 统一 `const` / `let`
-   `if` 条件语句必须加大括号, 禁止单行 `if (condition) statement;` 写法 (包括单行的 `if (...) return;`, 统一写成 `if (...) { return; }`), `else` 同理

### React 组件

-   组件统一 `const Xxx = () => {...}` 形式, 末尾 `export default Xxx;`
-   函数式组件 + Hooks, 不使用 class 组件
-   内联 `style` 仅用于动态值, 静态样式一律用 Tailwind class

## 样式约定

-   样式全部使用 Tailwind CSS v4 的 className 工具类, 类名合并使用 `cn` 包 (npm 包名 `cn`, 不要自实现 merge 函数)
-   不使用 CSS Modules / styled-components / 原生 CSS 文件, 全局样式集中在 `src/index.css`
-   Tailwind 入口必须是 `src/index.css` (必须是 .css 扩展名, @tailwindcss/vite 不处理 .scss)
-   少量全局样式写在 `src/index.css` 的 `@layer` 中, 支持嵌套写法
-   主题色: antd 主色 `#722ed1` (紫色), 页面背景白色, 侧边栏 `#f7f8fa`, 用户消息气泡浅灰背景 `#f2f3f5`

## 项目结构与数据

-   会话与消息持久化在 IndexedDB (`src/db/index.js`), 会话 id 使用 `crypto.randomUUID()`
-   消息中的图片: 存储用 data URL, 发送给 Ollama 时用纯 base64 (对象上 `_base64` 字段), 加载时由 data URL 还原
-   模型接口: Ollama 本地服务 `http://localhost:11434`, 流式 `/api/chat` 返回 NDJSON
-   react-markdown v9 不传递 `inline` prop, 通过 `language-*` 类名区分行内/块级代码
-   代码运行面板 (CodeRunner): 若代码片段本身无法独立渲染成完整页面 (css/js 等), 不展示运行按钮, 只保留复制

## 工程约定

-   改完代码不要主动运行 `npm run build` / `npm run dev`, 由开发者自己验证
-   代码格式化使用 prettier (见 `prettier.config.js`)
