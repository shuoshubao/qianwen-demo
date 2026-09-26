// 基于 IndexedDB 的本地会话存储
// 库结构：
//   sessions: { id, title, model, createdAt, updatedAt }  会话元信息，id 为 crypto.randomUUID()
//   messages: { id, sessionId, role, content, images, time }  消息，按 sessionId 建索引
const DB_NAME = 'qianwen-demo';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';
const STORE_MESSAGES = 'messages';

let dbPromise = null;

function openDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
                    db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
                    const store = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
                    store.createIndex('sessionId', 'sessionId', { unique: false });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    return dbPromise;
}

/** 单 store 的读写封装：fn(objectStore) 返回请求对象 */
function request(storeName, mode, fn) {
    return openDB().then(
        db =>
            new Promise((resolve, reject) => {
                const req = fn(db.transaction(storeName, mode).objectStore(storeName));
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            })
    );
}

/** 更新会话部分字段，并刷新 updatedAt（用于列表排序） */
export const updateSession = (id, patch) =>
    openDB().then(
        db =>
            new Promise((resolve, reject) => {
                const t = db.transaction(STORE_SESSIONS, 'readwrite');
                const store = t.objectStore(STORE_SESSIONS);
                const getReq = store.get(id);
                getReq.onsuccess = () => {
                    const cur = getReq.result;
                    if (!cur) return;
                    store.put({ ...cur, ...patch, updatedAt: Date.now() });
                };
                t.oncomplete = () => resolve();
                t.onerror = () => reject(t.error);
            })
    );

export const createSession = session => request(STORE_SESSIONS, 'readwrite', s => s.put(session));

export const getSession = id => request(STORE_SESSIONS, 'readonly', s => s.get(id));

export const listSessions = () =>
    request(STORE_SESSIONS, 'readonly', s => s.getAll()).then(list =>
        (list || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    );

export const addMessage = msg => request(STORE_MESSAGES, 'readwrite', s => s.put(msg));

export const listMessages = sessionId =>
    request(STORE_MESSAGES, 'readonly', s => s.index('sessionId').getAll(sessionId)).then(list =>
        (list || []).sort((a, b) => a.time - b.time)
    );

/** 删除会话，并在同一事务内清理该会话的全部消息 */
export const deleteSession = id =>
    openDB().then(
        db =>
            new Promise((resolve, reject) => {
                const t = db.transaction([STORE_SESSIONS, STORE_MESSAGES], 'readwrite');
                t.objectStore(STORE_SESSIONS).delete(id);
                const cursorReq = t.objectStore(STORE_MESSAGES).index('sessionId').openCursor(IDBKeyRange.only(id));
                cursorReq.onsuccess = () => {
                    const cursor = cursorReq.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
                t.oncomplete = () => resolve();
                t.onerror = () => reject(t.error);
            })
    );