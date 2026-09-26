import { createContext, useContext } from 'react';

// openRunner(files) 打开代码运行面板: files: [{ name, lang, code }]
// openFile(file) 打开文件预览面板: file: { name, size, content }
export const RunnerContext = createContext(null);

export const useRunner = () => useContext(RunnerContext);
