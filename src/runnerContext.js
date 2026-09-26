import { createContext, useContext } from 'react';

// 提供 openRunner(files) 给深层级组件 (如代码块) 打开运行面板, files: [{ name, lang, code }]
export const RunnerContext = createContext(null);

export const useRunner = () => useContext(RunnerContext);
