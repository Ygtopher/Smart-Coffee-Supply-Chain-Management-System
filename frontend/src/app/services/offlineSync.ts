type QueueItem = {
  id: string;
  endpoint: string;
  method: string;
  body: any;
  createdAt: string;
  attempts: number;
};

const DB_NAME = 'coffee-scm-offline';
const STORE = 'aggregatorQueue';
const PROCESSOR_STORE = 'processorQueue';
const QUALITY_STORE = 'qualityQueue';
const LOGISTICS_STORE = 'logisticsQueue';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 4);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(PROCESSOR_STORE)) request.result.createObjectStore(PROCESSOR_STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(QUALITY_STORE)) request.result.createObjectStore(QUALITY_STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(LOGISTICS_STORE)) request.result.createObjectStore(LOGISTICS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function enqueueAggregatorWrite(endpoint: string, method: string, body: any) {
  const item: QueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    endpoint,
    method,
    body,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await withStore('readwrite', store => store.add(item));
  window.dispatchEvent(new Event('aggregator-sync-queue-changed'));
  return item;
}

export async function getAggregatorQueue(): Promise<QueueItem[]> {
  return withStore('readonly', store => store.getAll());
}

export async function removeAggregatorQueueItem(id: string) {
  await withStore('readwrite', store => store.delete(id));
  window.dispatchEvent(new Event('aggregator-sync-queue-changed'));
}

export async function syncAggregatorQueue(token: string | null) {
  if (!navigator.onLine || !token) return { synced: 0, remaining: (await getAggregatorQueue()).length };

  const items = await getAggregatorQueue();
  let synced = 0;
  for (const item of items) {
    try {
      const response = await fetch(`/api${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item.body),
      });
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      await removeAggregatorQueueItem(item.id);
      synced += 1;
    } catch {
      break;
    }
  }

  return { synced, remaining: (await getAggregatorQueue()).length };
}

async function enqueueWrite(storeName: string, eventName: string, endpoint: string, method: string, body: any) {
  const item: QueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    endpoint,
    method,
    body,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const request = tx.objectStore(storeName).add(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
  window.dispatchEvent(new Event(eventName));
  return item;
}

async function getQueue(storeName: string): Promise<QueueItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function removeQueueItem(storeName: string, eventName: string, id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const request = tx.objectStore(storeName).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
  window.dispatchEvent(new Event(eventName));
}

export async function enqueueProcessorWrite(endpoint: string, method: string, body: any) {
  return enqueueWrite(PROCESSOR_STORE, 'processor-sync-queue-changed', endpoint, method, body);
}

export async function getProcessorQueue(): Promise<QueueItem[]> {
  return getQueue(PROCESSOR_STORE);
}

export async function syncProcessorQueue(token: string | null) {
  if (!navigator.onLine || !token) return { synced: 0, remaining: (await getProcessorQueue()).length };
  const items = await getProcessorQueue();
  let synced = 0;
  for (const item of items) {
    try {
      const response = await fetch(`/api${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item.body),
      });
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      await removeQueueItem(PROCESSOR_STORE, 'processor-sync-queue-changed', item.id);
      synced += 1;
    } catch {
      break;
    }
  }
  return { synced, remaining: (await getProcessorQueue()).length };
}

export async function enqueueQualityWrite(endpoint: string, method: string, body: any) {
  return enqueueWrite(QUALITY_STORE, 'quality-sync-queue-changed', endpoint, method, body);
}

export async function getQualityQueue(): Promise<QueueItem[]> {
  return getQueue(QUALITY_STORE);
}

export async function syncQualityQueue(token: string | null) {
  if (!navigator.onLine || !token) return { synced: 0, remaining: (await getQualityQueue()).length };
  const items = await getQualityQueue();
  let synced = 0;
  for (const item of items) {
    try {
      const response = await fetch(`/api${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item.body),
      });
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      await removeQueueItem(QUALITY_STORE, 'quality-sync-queue-changed', item.id);
      synced += 1;
    } catch {
      break;
    }
  }
  return { synced, remaining: (await getQualityQueue()).length };
}

export async function enqueueLogisticsWrite(endpoint: string, method: string, body: any) {
  return enqueueWrite(LOGISTICS_STORE, 'logistics-sync-queue-changed', endpoint, method, body);
}

export async function getLogisticsQueue(): Promise<QueueItem[]> {
  return getQueue(LOGISTICS_STORE);
}

export async function syncLogisticsQueue(token: string | null) {
  if (!navigator.onLine || !token) return { synced: 0, remaining: (await getLogisticsQueue()).length };
  const items = await getLogisticsQueue();
  let synced = 0;
  for (const item of items) {
    try {
      const response = await fetch(`/api${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item.body),
      });
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      await removeQueueItem(LOGISTICS_STORE, 'logistics-sync-queue-changed', item.id);
      synced += 1;
    } catch {
      break;
    }
  }
  return { synced, remaining: (await getLogisticsQueue()).length };
}
