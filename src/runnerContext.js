import { createContext, useContext } from 'react';

// 提供 openRunner(code, lang) 给深层级组件（如代码块）打开运行面板
export const RunnerContext = createContext(null);

export const useRunner = () => useContext(RunnerContext);
