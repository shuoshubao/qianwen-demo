// Ollama 本地服务客户端，默认地址 http://localhost:11434
const OLLAMA_BASE = 'http://localhost:11434';

export const MODELS = [
    { id: 'qwen2.5vl:7b', name: 'Qwen2.5-VL 7B', vision: true },
    { id: 'deepseek-r1:7b', name: 'DeepSeek-R1 7B', vision: false }
];

/**
 * 以流式方式调用 Ollama 的 /api/chat 接口。
 * @param {Object} opts
 * @param {string} opts.model 模型 id
 * @param {Array} opts.messages [{ role, content, images? }]
 * @param {AbortSignal} opts.signal 用于中断请求
 * @param {(chunk: string) => void} opts.onToken 每次收到增量文本时回调
 */
export async function streamChat({ model, messages, signal, onToken }) {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal
    });

    if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ollama 请求失败 (${res.status}): ${text || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Ollama 返回 NDJSON，每行一个 JSON 对象
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            let data;
            try {
                data = JSON.parse(line);
            } catch {
                continue;
            }
            if (data.message?.content) {
                onToken(data.message.content);
            }
            if (data.error) {
                throw new Error(data.error);
            }
        }
    }
}

/** 把 File 读成 base64（不含 data: 前缀），供 Ollama 多模态使用 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = String(result).split(',')[1] || '';
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 从 DeepSeek-R1 的输出中拆分思考过程与正文。
 * 模型会把推理放在 <think>...</think> 中。
 */
export function splitThinking(content) {
    const openTag = '<think>';
    const closeTag = '</think>';
    if (!content.includes(openTag)) {
        return { reasoning: '', answer: content };
    }
    const start = content.indexOf(openTag) + openTag.length;
    const end = content.indexOf(closeTag);
    if (end === -1) {
        // 还在思考中，尚未闭合
        return { reasoning: content.slice(start), answer: '' };
    }
    const reasoning = content.slice(start, end);
    const answer = content.slice(end + closeTag.length);
    return { reasoning, answer };
}
