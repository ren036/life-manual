import { seedRecords, seedTasks } from '../data/seed';
import type { AppData, DocumentItem, LifeRecord, Recipe, TaskItem } from '../types';

const DATABASE_NAME = 'life-manual';
const DATABASE_VERSION = 3;
const RECORDS_STORE = 'records';
const ATTACHMENTS_STORE = 'attachments';
const RECIPES_STORE = 'recipes';
const DOCUMENTS_STORE = 'documents';
const TASKS_STORE = 'tasks';

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
      if (!database.objectStoreNames.contains(RECIPES_STORE)) database.createObjectStore(RECIPES_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(DOCUMENTS_STORE)) database.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(TASKS_STORE)) database.createObjectStore(TASKS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function toRecipe(record: LifeRecord): Recipe {
  return { id: record.id, title: record.title.replace(/ ·.*/, ''), notes: record.detail, ingredients: record.ingredients || [], category: '家常菜', date: record.date, createdAt: record.createdAt, attachmentName: record.attachmentName, hasFile: record.hasFile };
}

function toDocument(record: LifeRecord): DocumentItem {
  const category = record.kind === '维修' ? '家庭与房屋' : record.kind === '文件' ? '发票与保修' : '其他';
  return { id: record.id, title: record.title, description: record.detail, category, important: record.kind === '文件', date: record.date, createdAt: record.createdAt, attachmentName: record.attachmentName, hasFile: record.hasFile, isImage: record.kind === '图片' };
}

export async function loadAppData(): Promise<AppData> {
  const database = await openDatabase();
  let [recipes, documents, tasks] = await Promise.all([
    requestResult(database.transaction(RECIPES_STORE).objectStore(RECIPES_STORE).getAll()) as Promise<Recipe[]>,
    requestResult(database.transaction(DOCUMENTS_STORE).objectStore(DOCUMENTS_STORE).getAll()) as Promise<DocumentItem[]>,
    requestResult(database.transaction(TASKS_STORE).objectStore(TASKS_STORE).getAll()) as Promise<TaskItem[]>,
  ]);
  if (!recipes.length && !documents.length) {
    let legacy = await requestResult(database.transaction(RECORDS_STORE).objectStore(RECORDS_STORE).getAll()) as LifeRecord[];
    if (!legacy.length) legacy = seedRecords;
    recipes = legacy.filter((item) => item.kind === '菜品').map(toRecipe);
    documents = legacy.filter((item) => item.kind !== '菜品').map(toDocument);
    const transaction = database.transaction([RECIPES_STORE, DOCUMENTS_STORE], 'readwrite');
    recipes.forEach((item) => transaction.objectStore(RECIPES_STORE).put(item));
    documents.forEach((item) => transaction.objectStore(DOCUMENTS_STORE).put(item));
    await complete(transaction);
  }
  if (!tasks.length) {
    tasks = [...seedTasks];
    const transaction = database.transaction(TASKS_STORE, 'readwrite');
    tasks.forEach((item) => transaction.objectStore(TASKS_STORE).put(item));
    await complete(transaction);
  }
  const newest = <T extends { createdAt: number }>(items: T[]) => items.sort((a, b) => b.createdAt - a.createdAt);
  return { recipes: newest(recipes), documents: newest(documents), tasks: newest(tasks) };
}

async function putItem(store: string, item: Recipe | DocumentItem | TaskItem, file?: File): Promise<void> {
  const database = await openDatabase();
  const stores = file ? [store, ATTACHMENTS_STORE] : [store];
  const transaction = database.transaction(stores, 'readwrite');
  transaction.objectStore(store).put(item);
  if (file) transaction.objectStore(ATTACHMENTS_STORE).put(file, item.id);
  await complete(transaction);
}

export const insertRecipe = (item: Recipe, file?: File) => putItem(RECIPES_STORE, item, file);
export const insertDocument = (item: DocumentItem, file?: File) => putItem(DOCUMENTS_STORE, item, file);
export const insertTask = (item: TaskItem) => putItem(TASKS_STORE, item);
export const updateTask = (item: TaskItem) => putItem(TASKS_STORE, item);

export async function getAttachmentUrl(id: string): Promise<string | undefined> {
  const database = await openDatabase();
  const file = await requestResult(database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).get(id)) as Blob | undefined;
  return file ? URL.createObjectURL(file) : undefined;
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
