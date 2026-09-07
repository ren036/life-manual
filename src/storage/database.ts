import { attachmentIds } from '../attachments';
import { seedDocuments, seedRecipes, seedTasks } from '../data/seed';
import type { AppData, DocumentItem, PendingAttachment, Recipe, TaskItem } from '../types';

const DATABASE_NAME = 'life-manual';
const DATABASE_VERSION = 4;
const RECORDS_STORE = 'records';
const ATTACHMENTS_STORE = 'attachments';
const RECIPES_STORE = 'recipes';
const DOCUMENTS_STORE = 'documents';
const TASKS_STORE = 'tasks';
const SETTINGS_STORE = 'settings';

export interface BackupFile {
  id: string;
  name: string;
  type: string;
  data: string;
}

export interface LifeManualBackup {
  version: 1;
  exportedAt: string;
  recipes: Recipe[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  attachments: BackupFile[];
}

interface LegacyRecord {
  id: string;
  kind: '菜品' | '维修' | '文件' | '图片' | '通用';
  title: string;
  detail: string;
  date: string;
  createdAt: number;
  ingredients?: string[];
  attachmentName?: string;
  hasFile?: boolean;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDS_STORE)) {
        database.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(ATTACHMENTS_STORE)) {
        database.createObjectStore(ATTACHMENTS_STORE);
      }
      if (!database.objectStoreNames.contains(RECIPES_STORE))
        database.createObjectStore(RECIPES_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(DOCUMENTS_STORE))
        database.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(TASKS_STORE))
        database.createObjectStore(TASKS_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(SETTINGS_STORE))
        database.createObjectStore(SETTINGS_STORE);
      if ((event as IDBVersionChangeEvent).oldVersion > 0)
        request.transaction?.objectStore(SETTINGS_STORE).put(true, 'initialized');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('保存已中止'));
  });
}

function toRecipe(record: LegacyRecord): Recipe {
  return {
    id: record.id,
    title: record.title.replace(/ ·.*/, ''),
    notes: record.detail,
    ingredients: record.ingredients || [],
    category: '家常菜',
    date: record.date,
    createdAt: record.createdAt,
    attachmentName: record.attachmentName,
    hasFile: record.hasFile,
  };
}

function toDocument(record: LegacyRecord): DocumentItem {
  const category =
    record.kind === '维修' ? '家庭与房屋' : record.kind === '文件' ? '发票与保修' : '其他';
  return {
    id: record.id,
    title: record.title,
    description: record.detail,
    category,
    important: record.kind === '文件',
    date: record.date,
    createdAt: record.createdAt,
    attachmentName: record.attachmentName,
    hasFile: record.hasFile,
    isImage: record.kind === '图片',
  };
}

export async function loadAppData(): Promise<AppData> {
  const database = await openDatabase();
  let [recipes, documents, tasks, initialized] = await Promise.all([
    requestResult(
      database.transaction(RECIPES_STORE).objectStore(RECIPES_STORE).getAll(),
    ) as Promise<Recipe[]>,
    requestResult(
      database.transaction(DOCUMENTS_STORE).objectStore(DOCUMENTS_STORE).getAll(),
    ) as Promise<DocumentItem[]>,
    requestResult(database.transaction(TASKS_STORE).objectStore(TASKS_STORE).getAll()) as Promise<
      TaskItem[]
    >,
    requestResult(
      database.transaction(SETTINGS_STORE).objectStore(SETTINGS_STORE).get('initialized'),
    ) as Promise<boolean | undefined>,
  ]);
  if (!initialized && !recipes.length && !documents.length) {
    const legacy = (await requestResult(
      database.transaction(RECORDS_STORE).objectStore(RECORDS_STORE).getAll(),
    )) as LegacyRecord[];
    recipes = legacy.length
      ? legacy.filter((item) => item.kind === '菜品').map(toRecipe)
      : [...seedRecipes];
    documents = legacy.length
      ? legacy.filter((item) => item.kind !== '菜品').map(toDocument)
      : [...seedDocuments];
    const transaction = database.transaction([RECIPES_STORE, DOCUMENTS_STORE], 'readwrite');
    recipes.forEach((item) => transaction.objectStore(RECIPES_STORE).put(item));
    documents.forEach((item) => transaction.objectStore(DOCUMENTS_STORE).put(item));
    await complete(transaction);
  }
  if (!initialized && !tasks.length) {
    tasks = [...seedTasks];
    const transaction = database.transaction(TASKS_STORE, 'readwrite');
    tasks.forEach((item) => transaction.objectStore(TASKS_STORE).put(item));
    await complete(transaction);
  }
  if (!initialized) {
    const transaction = database.transaction(SETTINGS_STORE, 'readwrite');
    transaction.objectStore(SETTINGS_STORE).put(true, 'initialized');
    await complete(transaction);
  }
  const newest = <T extends { createdAt: number }>(items: T[]) =>
    items.sort((a, b) => b.createdAt - a.createdAt);
  return { recipes: newest(recipes), documents: newest(documents), tasks: newest(tasks) };
}

async function putItem(
  store: string,
  item: Recipe | DocumentItem | TaskItem,
  files: PendingAttachment[] = [],
  removedIds: string[] = [],
): Promise<void> {
  const database = await openDatabase();
  const stores = files.length || removedIds.length ? [store, ATTACHMENTS_STORE] : [store];
  const transaction = database.transaction(stores, 'readwrite');
  transaction.objectStore(store).put(item);
  files.forEach(({ id, file }) => transaction.objectStore(ATTACHMENTS_STORE).put(file, id));
  removedIds.forEach((id) => transaction.objectStore(ATTACHMENTS_STORE).delete(id));
  await complete(transaction);
}

export const insertRecipe = (item: Recipe, files?: PendingAttachment[]) =>
  putItem(RECIPES_STORE, item, files);
export const insertDocument = (item: DocumentItem, files?: PendingAttachment[]) =>
  putItem(DOCUMENTS_STORE, item, files);
export async function updateRecord(
  item: Recipe | DocumentItem,
  previous: Recipe | DocumentItem,
  files: PendingAttachment[],
): Promise<void> {
  const retained = new Set(attachmentIds(item));
  const removed = attachmentIds(previous).filter((id) => !retained.has(id));
  await putItem('ingredients' in item ? RECIPES_STORE : DOCUMENTS_STORE, item, files, removed);
}

export const insertTask = (item: TaskItem) => putItem(TASKS_STORE, item);
export const updateTask = (item: TaskItem) => putItem(TASKS_STORE, item);

export async function deleteRecord(item: Recipe | DocumentItem): Promise<void> {
  const database = await openDatabase();
  const store = 'ingredients' in item ? RECIPES_STORE : DOCUMENTS_STORE;
  const transaction = database.transaction([store, ATTACHMENTS_STORE], 'readwrite');
  transaction.objectStore(store).delete(item.id);
  attachmentIds(item).forEach((id) => transaction.objectStore(ATTACHMENTS_STORE).delete(id));
  await complete(transaction);
}

export async function deleteTask(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(TASKS_STORE, 'readwrite');
  transaction.objectStore(TASKS_STORE).delete(id);
  await complete(transaction);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(value: string, type: string): Blob {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

export async function exportBackup(): Promise<LifeManualBackup> {
  const database = await openDatabase();
  const [recipes, documents, tasks, keys, files] = await Promise.all([
    requestResult(
      database.transaction(RECIPES_STORE).objectStore(RECIPES_STORE).getAll(),
    ) as Promise<Recipe[]>,
    requestResult(
      database.transaction(DOCUMENTS_STORE).objectStore(DOCUMENTS_STORE).getAll(),
    ) as Promise<DocumentItem[]>,
    requestResult(database.transaction(TASKS_STORE).objectStore(TASKS_STORE).getAll()) as Promise<
      TaskItem[]
    >,
    requestResult(
      database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).getAllKeys(),
    ) as Promise<IDBValidKey[]>,
    requestResult(
      database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).getAll(),
    ) as Promise<Blob[]>,
  ]);
  const attachments = await Promise.all(
    files.map(async (file, index) => ({
      id: String(keys[index]),
      name: '附件',
      type: file.type,
      data: await blobToBase64(file),
    })),
  );
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes,
    documents,
    tasks,
    attachments,
  };
}

export function validateBackup(value: unknown): value is LifeManualBackup {
  const backup = value as Partial<LifeManualBackup>;
  return (
    backup?.version === 1 &&
    Array.isArray(backup.recipes) &&
    Array.isArray(backup.documents) &&
    Array.isArray(backup.tasks) &&
    Array.isArray(backup.attachments)
  );
}

export async function importBackup(backup: LifeManualBackup): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [RECIPES_STORE, DOCUMENTS_STORE, TASKS_STORE, ATTACHMENTS_STORE],
    'readwrite',
  );
  [RECIPES_STORE, DOCUMENTS_STORE, TASKS_STORE, ATTACHMENTS_STORE].forEach((store) =>
    transaction.objectStore(store).clear(),
  );
  backup.recipes.forEach((item) => transaction.objectStore(RECIPES_STORE).put(item));
  backup.documents.forEach((item) => transaction.objectStore(DOCUMENTS_STORE).put(item));
  backup.tasks.forEach((item) => transaction.objectStore(TASKS_STORE).put(item));
  backup.attachments.forEach((file) =>
    transaction.objectStore(ATTACHMENTS_STORE).put(base64ToBlob(file.data, file.type), file.id),
  );
  await complete(transaction);
}

export async function getAttachmentUrl(id: string): Promise<string | undefined> {
  const database = await openDatabase();
  const file = (await requestResult(
    database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).get(id),
  )) as Blob | undefined;
  return file ? URL.createObjectURL(file) : undefined;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function openAttachment(id: string): Promise<boolean> {
  const database = await openDatabase();
  const file = (await requestResult(
    database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).get(id),
  )) as Blob | undefined;
  if (!file) return false;
  const url = URL.createObjectURL(file);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
