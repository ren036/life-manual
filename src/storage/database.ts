import { seedRecords } from '../data/seed';
import type { LifeRecord } from '../types';

const DATABASE_NAME = 'life-manual';
const DATABASE_VERSION = 2;
const RECORDS_STORE = 'records';
const ATTACHMENTS_STORE = 'attachments';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDS_STORE)) {
        database.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(ATTACHMENTS_STORE)) {
        database.createObjectStore(ATTACHMENTS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadRecords(): Promise<LifeRecord[]> {
  const database = await openDatabase();
  let records = await requestResult(database.transaction(RECORDS_STORE).objectStore(RECORDS_STORE).getAll()) as LifeRecord[];
  if (!records.length) {
    const transaction = database.transaction(RECORDS_STORE, 'readwrite');
    seedRecords.forEach((record) => transaction.objectStore(RECORDS_STORE).put(record));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    records = [...seedRecords];
  }
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

export async function insertRecord(record: LifeRecord, file?: File): Promise<void> {
  const database = await openDatabase();
  const stores = file ? [RECORDS_STORE, ATTACHMENTS_STORE] : [RECORDS_STORE];
  const transaction = database.transaction(stores, 'readwrite');
  transaction.objectStore(RECORDS_STORE).put(record);
  if (file) transaction.objectStore(ATTACHMENTS_STORE).put(file, record.id);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function openAttachment(id: string): Promise<boolean> {
  const database = await openDatabase();
  const file = await requestResult(database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).get(id)) as Blob | undefined;
  if (!file) return false;
  const url = URL.createObjectURL(file);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
