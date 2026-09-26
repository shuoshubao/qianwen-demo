import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// @monaco-editor/loader 与 monaco-editor 本体都不走 npm 打包,
// 首次打开编辑器时从 CDN 按需加载 (esm.sh 转译 CJS 为 ESM)
let loaderPromise = null;
const getLoader = () => {
    if (!loaderPromise) {
        loaderPromise = import('https://esm.sh/@monaco-editor/loader@1.4.0').then(m => {
            const loader = m.default;
            loader.config({
                paths: {
                    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
                }
            });
            return loader;
        });
    }
    return loaderPromise;
};

const MonacoEditor = forwardRef(({ value, language, onChange, readOnly }, ref) => {
    const containerRef = useRef(null);
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    // 编辑器是异步加载的, 创建完成前 props 可能已更新, 用 ref 始终持有最新值
    const valueRef = useRef(value);
    const langRef = useRef(language);
    const onChangeRef = useRef(onChange);
    const readOnlyRef = useRef(readOnly);
    valueRef.current = value;
    langRef.current = language;
    onChangeRef.current = onChange;
    readOnlyRef.current = readOnly;

    // 供父组件在切换 tab 时直接读取编辑器当前内容
    useImperativeHandle(ref, () => ({
        getValue: () => editorRef.current?.getValue() ?? ''
    }));

    useEffect(() => {
        let disposed = false;
        getLoader()
            .then(loader => loader.init())
            .then(monaco => {
                if (disposed || !containerRef.current) return;
                monacoRef.current = monaco;
                const editor = monaco.editor.create(containerRef.current, {
                    value: valueRef.current,
                    language: langRef.current,
                    theme: 'vs',
                    readOnly: !!readOnlyRef.current,
                    domReadOnly: !!readOnlyRef.current,
                    renderLineHighlight: readOnlyRef.current ? 'none' : 'line',
                    overviewRulerLanes: readOnlyRef.current ? 0 : 3,
                    contextmenu: !readOnlyRef.current,
                    minimap: { enabled: true },
                    fontSize: 13,
                    lineHeight: 20,
                    tabSize: 2,
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                });
                editor.onDidChangeModelContent(() => {
                    onChangeRef.current?.(editor.getValue());
                });
                editorRef.current = editor;
            });
        return () => {
            disposed = true;
            editorRef.current?.dispose();
            editorRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 外部 value / language 变化时同步 (编辑中 value 与内部一致, 不会重复 setValue)
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (editor.getValue() !== (value ?? '')) editor.setValue(value ?? '');
        if (monacoRef.current) {
            monacoRef.current.editor.setModelLanguage(editor.getModel(), language);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, language]);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});

export default MonacoEditor;
