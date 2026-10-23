const DB_NAME = 'fahem-local-files';
const STORE_NAME = 'attachments';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('التخزين المحلي للملفات غير مدعوم في هذا المتصفح.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('تعذر فتح مخزن الملفات.'));
  });
}

export async function saveAttachment(id, file) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(file, id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('تعذر حفظ الملف.'));
      transaction.onabort = () => reject(transaction.error || new Error('أُلغي حفظ الملف.'));
    });
    return { name: file.name, type: file.type, size: file.size, savedAt: new Date().toISOString() };
  } finally {
    database.close();
  }
}

export async function loadAttachment(id) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('تعذر قراءة الملف.'));
    });
  } finally {
    database.close();
  }
}
