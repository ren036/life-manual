import { attachmentIds, recordAttachments } from '../attachments';
import { isTrashExpired } from '../dataSafety';
import { seedDocuments, seedRecipes, seedTasks } from '../data/seed';
import type {
  AppData,
  AddMode,
  Attachment,
  DocumentItem,
  NoteEntry,
  PendingAttachment,
  Recipe,
  TaskItem,
  TrashEntry,
} from '../types';

const DATABASE_NAME = 'life-manual';
const DATABASE_VERSION = 5;
const RECORDS_STORE = 'records';
const ATTACHMENTS_STORE = 'attachments';
const RECIPES_STORE = 'recipes';
const DOCUMENTS_STORE = 'documents';
const TASKS_STORE = 'tasks';
const NOTES_STORE = 'notes';
const SETTINGS_STORE = 'settings';
const CURRENT_BACKUP_VERSION = 4;
const PRE_IMPORT_BACKUP_KEY = 'pre-import-backup';

export type ImportMode = 'merge' | 'replace';

export interface BackupFile {
  id: string;
  name: string;
  type: string;
  data: string;
}

export interface LifeManualBackup {
  version: 4;
  exportedAt: string;
  recipes: Recipe[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  notes: NoteEntry[];
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
      if (!database.objectStoreNames.contains(NOTES_STORE))
        database.createObjectStore(NOTES_STORE, { keyPath: 'id' });
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

export async function loadAppData(includeSeedData = true): Promise<AppData> {
  const database = await openDatabase();
  await purgeExpiredTrash(database);
  let [recipes, documents, tasks, notes, initialized] = await Promise.all([
    requestResult(
      database.transaction(RECIPES_STORE).objectStore(RECIPES_STORE).getAll(),
    ) as Promise<Recipe[]>,
    requestResult(
      database.transaction(DOCUMENTS_STORE).objectStore(DOCUMENTS_STORE).getAll(),
    ) as Promise<DocumentItem[]>,
    requestResult(database.transaction(TASKS_STORE).objectStore(TASKS_STORE).getAll()) as Promise<
      TaskItem[]
    >,
    requestResult(database.transaction(NOTES_STORE).objectStore(NOTES_STORE).getAll()) as Promise<
      NoteEntry[]
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
      : includeSeedData
        ? [...seedRecipes]
        : [];
    documents = legacy.length
      ? legacy.filter((item) => item.kind !== '菜品').map(toDocument)
      : includeSeedData
        ? [...seedDocuments]
        : [];
    const transaction = database.transaction([RECIPES_STORE, DOCUMENTS_STORE], 'readwrite');
    recipes.forEach((item) => transaction.objectStore(RECIPES_STORE).put(item));
    documents.forEach((item) => transaction.objectStore(DOCUMENTS_STORE).put(item));
    await complete(transaction);
  }
  if (!initialized && !tasks.length) {
    tasks = includeSeedData ? [...seedTasks] : [];
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
  return {
    recipes: newest(recipes.filter((item) => item.deletedAt === undefined)),
    documents: newest(documents.filter((item) => item.deletedAt === undefined)),
    tasks: newest(tasks.filter((item) => item.deletedAt === undefined)),
    notes: newest(notes.filter((item) => item.deletedAt === undefined)),
  };
}

async function putItem(
  store: string,
  item: Recipe | DocumentItem | TaskItem | NoteEntry,
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
export const insertNote = (item: NoteEntry, audio?: PendingAttachment) =>
  putItem(NOTES_STORE, item, audio ? [audio] : []);
export const updateNote = (item: NoteEntry, previous: NoteEntry, audio?: PendingAttachment) => {
  const removed = previous.audio && previous.audio.id !== item.audio?.id ? [previous.audio.id] : [];
  return putItem(NOTES_STORE, item, audio ? [audio] : [], removed);
};
export const deleteNote = (item: NoteEntry) =>
  putItem(NOTES_STORE, { ...item, deletedAt: Date.now() });

export async function bulkUpdateItems(
  mode: AddMode,
  items: Array<Recipe | DocumentItem | TaskItem>,
): Promise<void> {
  if (!items.length) return;
  const storeName =
    mode === 'recipes' ? RECIPES_STORE : mode === 'documents' ? DOCUMENTS_STORE : TASKS_STORE;
  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  items.forEach((item) => store.put(item));
  await complete(transaction);
}

export async function advanceTask(item: TaskItem, next?: TaskItem): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(TASKS_STORE, 'readwrite');
  const store = transaction.objectStore(TASKS_STORE);
  store.put(item);
  if (next) store.put(next);
  await complete(transaction);
}

export async function reopenRecurringTask(item: TaskItem, generatedTaskId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(TASKS_STORE, 'readwrite');
  const store = transaction.objectStore(TASKS_STORE);
  store.put(item);
  store.delete(generatedTaskId);
  await complete(transaction);
}

export async function setReminderEnabled(enabled: boolean): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SETTINGS_STORE, 'readwrite');
  transaction.objectStore(SETTINGS_STORE).put(enabled, 'reminders-enabled');
  await complete(transaction);
}

export async function claimReminderDate(date: string): Promise<boolean> {
  const database = await openDatabase();
  const transaction = database.transaction(SETTINGS_STORE, 'readwrite');
  const store = transaction.objectStore(SETTINGS_STORE);
  const key = 'last-reminder-date';
  const previous = (await requestResult(store.get(key))) as string | undefined;
  if (previous === date) {
    await complete(transaction);
    return false;
  }
  store.put(date, key);
  await complete(transaction);
  return true;
}

export async function deleteRecord(item: Recipe | DocumentItem): Promise<PendingAttachment[]> {
  await putItem('ingredients' in item ? RECIPES_STORE : DOCUMENTS_STORE, {
    ...item,
    deletedAt: Date.now(),
  });
  return [];
}

export const restoreRecord = (item: Recipe | DocumentItem, files: PendingAttachment[]) => {
  const { deletedAt: _deletedAt, ...restored } = item;
  return putItem(
    'ingredients' in item ? RECIPES_STORE : DOCUMENTS_STORE,
    restored as Recipe | DocumentItem,
    files,
  );
};

export async function deleteTask(item: TaskItem): Promise<void> {
  await putItem(TASKS_STORE, { ...item, deletedAt: Date.now() });
}

async function readTrash(database: IDBDatabase): Promise<TrashEntry[]> {
  const [recipes, documents, tasks, notes] = await Promise.all([
    requestResult(
      database.transaction(RECIPES_STORE).objectStore(RECIPES_STORE).getAll(),
    ) as Promise<Recipe[]>,
    requestResult(
      database.transaction(DOCUMENTS_STORE).objectStore(DOCUMENTS_STORE).getAll(),
    ) as Promise<DocumentItem[]>,
    requestResult(database.transaction(TASKS_STORE).objectStore(TASKS_STORE).getAll()) as Promise<
      TaskItem[]
    >,
    requestResult(database.transaction(NOTES_STORE).objectStore(NOTES_STORE).getAll()) as Promise<
      NoteEntry[]
    >,
  ]);
  return [
    ...recipes
      .filter((item): item is Recipe & { deletedAt: number } => typeof item.deletedAt === 'number')
      .map((item) => ({ kind: 'recipe' as const, item })),
    ...documents
      .filter(
        (item): item is DocumentItem & { deletedAt: number } => typeof item.deletedAt === 'number',
      )
      .map((item) => ({ kind: 'document' as const, item })),
    ...tasks
      .filter(
        (item): item is TaskItem & { deletedAt: number } => typeof item.deletedAt === 'number',
      )
      .map((item) => ({ kind: 'task' as const, item })),
    ...notes
      .filter(
        (item): item is NoteEntry & { deletedAt: number } => typeof item.deletedAt === 'number',
      )
      .map((item) => ({ kind: 'note' as const, item })),
  ].sort((a, b) => b.item.deletedAt - a.item.deletedAt);
}

async function permanentlyDeleteEntries(
  database: IDBDatabase,
  entries: TrashEntry[],
): Promise<void> {
  if (!entries.length) return;
  const removedRecordKeys = new Set(
    entries
      .filter((entry) => entry.kind !== 'task')
      .map((entry) => `${entry.kind}:${entry.item.id}`),
  );
  const tasks = removedRecordKeys.size
    ? ((await requestResult(
        database.transaction(TASKS_STORE).objectStore(TASKS_STORE).getAll(),
      )) as TaskItem[])
    : [];
  const deletedTaskIds = new Set(
    entries.filter((entry) => entry.kind === 'task').map((entry) => entry.item.id),
  );
  const transaction = database.transaction(
    [RECIPES_STORE, DOCUMENTS_STORE, TASKS_STORE, NOTES_STORE, ATTACHMENTS_STORE],
    'readwrite',
  );
  const attachments = transaction.objectStore(ATTACHMENTS_STORE);
  const taskStore = transaction.objectStore(TASKS_STORE);
  tasks
    .filter(
      (task) =>
        !deletedTaskIds.has(task.id) &&
        task.relatedRecord &&
        removedRecordKeys.has(`${task.relatedRecord.kind}:${task.relatedRecord.id}`),
    )
    .forEach((task) => taskStore.put({ ...task, relatedRecord: undefined }));
  entries.forEach((entry) => {
    const store =
      entry.kind === 'recipe'
        ? RECIPES_STORE
        : entry.kind === 'document'
          ? DOCUMENTS_STORE
          : entry.kind === 'task'
            ? TASKS_STORE
            : NOTES_STORE;
    transaction.objectStore(store).delete(entry.item.id);
    if (entry.kind === 'note') {
      if (entry.item.audio) attachments.delete(entry.item.audio.id);
    } else if (entry.kind !== 'task') {
      attachmentIds(entry.item).forEach((id) => attachments.delete(id));
    }
  });
  await complete(transaction);
}

async function purgeExpiredTrash(database: IDBDatabase): Promise<void> {
  const expired = (await readTrash(database)).filter((entry) =>
    isTrashExpired(entry.item.deletedAt),
  );
  await permanentlyDeleteEntries(database, expired);
}

export async function loadTrash(): Promise<TrashEntry[]> {
  const database = await openDatabase();
  await purgeExpiredTrash(database);
  return readTrash(database);
}

export async function restoreTrashEntry(entry: TrashEntry): Promise<void> {
  const { deletedAt: _deletedAt, ...restored } = entry.item;
  const store =
    entry.kind === 'recipe'
      ? RECIPES_STORE
      : entry.kind === 'document'
        ? DOCUMENTS_STORE
        : entry.kind === 'task'
          ? TASKS_STORE
          : NOTES_STORE;
  await putItem(store, restored as Recipe | DocumentItem | TaskItem | NoteEntry);
}

export async function permanentlyDeleteTrashEntry(entry: TrashEntry): Promise<void> {
  const database = await openDatabase();
  await permanentlyDeleteEntries(database, [entry]);
}

export async function emptyTrash(): Promise<void> {
  const database = await openDatabase();
  await permanentlyDeleteEntries(database, await readTrash(database));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToFile(value: string, name: string, type: string): File {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAttachment(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    !!value.id &&
    typeof value.name === 'string' &&
    typeof value.type === 'string'
  );
}

function isRelatedRecord(value: unknown): boolean {
  return (
    isObject(value) &&
    (value.kind === 'recipe' || value.kind === 'document') &&
    typeof value.id === 'string' &&
    !!value.id
  );
}

function hasValidContent(value: Record<string, unknown>): boolean {
  return (
    (value.tags === undefined || isStringArray(value.tags)) &&
    (value.attachments === undefined ||
      (Array.isArray(value.attachments) && value.attachments.every(isAttachment))) &&
    (value.steps === undefined ||
      (Array.isArray(value.steps) &&
        value.steps.every(
          (step) =>
            isObject(step) &&
            typeof step.id === 'string' &&
            !!step.id &&
            typeof step.text === 'string' &&
            Array.isArray(step.attachments) &&
            step.attachments.every(isAttachment),
        )))
  );
}

function isCookingRecord(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    !!value.id &&
    typeof value.date === 'string' &&
    typeof value.notes === 'string' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    Array.isArray(value.attachments) &&
    value.attachments.every(isAttachment)
  );
}

function isRecipe(value: unknown): value is Recipe {
  return (
    isObject(value) &&
    hasValidContent(value) &&
    typeof value.id === 'string' &&
    !!value.id &&
    typeof value.title === 'string' &&
    typeof value.notes === 'string' &&
    isStringArray(value.ingredients) &&
    typeof value.category === 'string' &&
    typeof value.date === 'string' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    isOptionalBoolean(value.favorite) &&
    isOptionalString(value.attachmentName) &&
    isOptionalBoolean(value.hasFile) &&
    isOptionalFiniteNumber(value.deletedAt) &&
    (value.cookingRecords === undefined ||
      (Array.isArray(value.cookingRecords) && value.cookingRecords.every(isCookingRecord)))
  );
}

function isDocument(value: unknown): value is DocumentItem {
  return (
    isObject(value) &&
    hasValidContent(value) &&
    typeof value.id === 'string' &&
    !!value.id &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.category === 'string' &&
    typeof value.important === 'boolean' &&
    typeof value.date === 'string' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    isOptionalString(value.expiryDate) &&
    isOptionalString(value.ocrText) &&
    isOptionalString(value.attachmentName) &&
    isOptionalBoolean(value.hasFile) &&
    isOptionalBoolean(value.isImage) &&
    isOptionalFiniteNumber(value.deletedAt)
  );
}

function isTask(value: unknown): value is TaskItem {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    !!value.id &&
    typeof value.title === 'string' &&
    typeof value.notes === 'string' &&
    typeof value.category === 'string' &&
    (value.tags === undefined || isStringArray(value.tags)) &&
    ['普通', '重要', '紧急'].includes(String(value.priority)) &&
    (value.repeat === undefined ||
      ['不重复', '每天', '每周', '每月', '自定义'].includes(String(value.repeat))) &&
    (value.repeatInterval === undefined ||
      (typeof value.repeatInterval === 'number' &&
        Number.isInteger(value.repeatInterval) &&
        value.repeatInterval >= 1)) &&
    (value.repeatUnit === undefined || ['天', '周', '月'].includes(String(value.repeatUnit))) &&
    (value.repeatWeekdays === undefined ||
      (Array.isArray(value.repeatWeekdays) &&
        value.repeatWeekdays.every(
          (day) => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6,
        ) &&
        new Set(value.repeatWeekdays).size === value.repeatWeekdays.length)) &&
    (value.repeatMonthDay === undefined ||
      (typeof value.repeatMonthDay === 'number' &&
        Number.isInteger(value.repeatMonthDay) &&
        value.repeatMonthDay >= 1 &&
        value.repeatMonthDay <= 31)) &&
    isOptionalString(value.repeatEndDate) &&
    isOptionalString(value.repeatAnchorDate) &&
    (value.overduePolicy === undefined ||
      ['按原计划顺延', '从完成日期顺延'].includes(String(value.overduePolicy))) &&
    typeof value.completed === 'boolean' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    isOptionalString(value.dueDate) &&
    (value.completedAt === undefined ||
      (typeof value.completedAt === 'number' && Number.isFinite(value.completedAt))) &&
    isOptionalBoolean(value.skipped) &&
    isOptionalString(value.generatedFromTaskId) &&
    (value.relatedRecord === undefined || isRelatedRecord(value.relatedRecord)) &&
    isOptionalFiniteNumber(value.deletedAt)
  );
}

function isNote(value: unknown): value is NoteEntry {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    !!value.id &&
    typeof value.title === 'string' &&
    typeof value.content === 'string' &&
    ['开心', '平静', '低落', '焦虑', '生气'].includes(String(value.mood)) &&
    (value.audio === undefined || isAttachment(value.audio)) &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    isOptionalFiniteNumber(value.updatedAt) &&
    isOptionalFiniteNumber(value.deletedAt)
  );
}

function isBackupFile(value: unknown): value is BackupFile {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    !!value.id &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.data === 'string' &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data)
  );
}

function hasUniqueIds(items: Array<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export function parseBackup(value: unknown): LifeManualBackup {
  if (!isObject(value)) throw new Error('备份内容不是有效对象');
  if (![1, 2, 3, CURRENT_BACKUP_VERSION].includes(Number(value.version)))
    throw new Error(`不支持的备份版本：${String(value.version)}`);
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)))
    throw new Error('备份导出时间无效');
  if (!Array.isArray(value.recipes) || !value.recipes.every(isRecipe))
    throw new Error('菜谱数据结构不完整');
  if (!Array.isArray(value.documents) || !value.documents.every(isDocument))
    throw new Error('资料数据结构不完整');
  if (!Array.isArray(value.tasks) || !value.tasks.every(isTask))
    throw new Error('待办数据结构不完整');
  const notes = value.notes === undefined ? [] : value.notes;
  if (!Array.isArray(notes) || !notes.every(isNote)) throw new Error('随记数据结构不完整');
  if (!Array.isArray(value.attachments) || !value.attachments.every(isBackupFile))
    throw new Error('附件数据结构或编码无效');
  if (
    !hasUniqueIds(value.recipes) ||
    !hasUniqueIds(value.documents) ||
    !hasUniqueIds(value.tasks) ||
    !hasUniqueIds(notes) ||
    !hasUniqueIds(value.attachments)
  )
    throw new Error('备份中存在重复的数据 ID');
  const availableAttachmentIds = new Set(value.attachments.map((file) => file.id));
  const referencedAttachmentIds = [
    ...value.recipes.flatMap(attachmentIds),
    ...value.documents.flatMap(attachmentIds),
    ...notes.flatMap((note) => (note.audio ? [note.audio.id] : [])),
  ];
  if (referencedAttachmentIds.some((id) => !availableAttachmentIds.has(id)))
    throw new Error('备份缺少记录所引用的附件');
  return {
    version: CURRENT_BACKUP_VERSION,
    exportedAt: value.exportedAt,
    recipes: value.recipes,
    documents: value.documents,
    tasks: value.tasks,
    notes,
    attachments: value.attachments,
  };
}

function attachmentNames(
  items: Array<Recipe | DocumentItem>,
  notes: NoteEntry[],
): Map<string, string> {
  return new Map(
    [
      ...items.flatMap((item) => [
        ...recordAttachments(item),
        ...(item.steps || []).flatMap((step) => step.attachments),
        ...('ingredients' in item
          ? (item.cookingRecords || []).flatMap((record) => record.attachments)
          : []),
      ]),
      ...notes.flatMap((note) => (note.audio ? [note.audio] : [])),
    ].map((attachment) => [attachment.id, attachment.name]),
  );
}

export async function exportBackup(): Promise<LifeManualBackup> {
  const database = await openDatabase();
  const [recipes, documents, tasks, notes, keys, files] = await Promise.all([
    requestResult(
      database.transaction(RECIPES_STORE).objectStore(RECIPES_STORE).getAll(),
    ) as Promise<Recipe[]>,
    requestResult(
      database.transaction(DOCUMENTS_STORE).objectStore(DOCUMENTS_STORE).getAll(),
    ) as Promise<DocumentItem[]>,
    requestResult(database.transaction(TASKS_STORE).objectStore(TASKS_STORE).getAll()) as Promise<
      TaskItem[]
    >,
    requestResult(database.transaction(NOTES_STORE).objectStore(NOTES_STORE).getAll()) as Promise<
      NoteEntry[]
    >,
    requestResult(
      database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).getAllKeys(),
    ) as Promise<IDBValidKey[]>,
    requestResult(
      database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).getAll(),
    ) as Promise<Blob[]>,
  ]);
  const names = attachmentNames([...recipes, ...documents], notes);
  const attachments = await Promise.all(
    files.map(async (file, index) => {
      const id = String(keys[index]);
      return {
        id,
        name: names.get(id) || (file instanceof File ? file.name : '') || '附件',
        type: file.type,
        data: await blobToBase64(file),
      };
    }),
  );
  return {
    version: CURRENT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    recipes,
    documents,
    tasks,
    notes,
    attachments,
  };
}

async function writeBackup(
  database: IDBDatabase,
  backup: LifeManualBackup,
  mode: ImportMode,
): Promise<void> {
  const files = backup.attachments.map((file) => ({
    id: file.id,
    value: base64ToFile(file.data, file.name || '附件', file.type),
  }));
  const transaction = database.transaction(
    [RECIPES_STORE, DOCUMENTS_STORE, TASKS_STORE, NOTES_STORE, ATTACHMENTS_STORE],
    'readwrite',
  );
  if (mode === 'replace')
    [RECIPES_STORE, DOCUMENTS_STORE, TASKS_STORE, NOTES_STORE, ATTACHMENTS_STORE].forEach((store) =>
      transaction.objectStore(store).clear(),
    );
  backup.recipes.forEach((item) => transaction.objectStore(RECIPES_STORE).put(item));
  backup.documents.forEach((item) => transaction.objectStore(DOCUMENTS_STORE).put(item));
  backup.tasks.forEach((item) => transaction.objectStore(TASKS_STORE).put(item));
  backup.notes.forEach((item) => transaction.objectStore(NOTES_STORE).put(item));
  files.forEach((file) => transaction.objectStore(ATTACHMENTS_STORE).put(file.value, file.id));
  await complete(transaction);
}

async function containsImportedData(
  database: IDBDatabase,
  backup: LifeManualBackup,
): Promise<boolean> {
  const groups: Array<[string, Array<{ id: string }>]> = [
    [RECIPES_STORE, backup.recipes],
    [DOCUMENTS_STORE, backup.documents],
    [TASKS_STORE, backup.tasks],
    [NOTES_STORE, backup.notes],
    [ATTACHMENTS_STORE, backup.attachments],
  ];
  const results = await Promise.all(
    groups.map(async ([store, items]) => {
      const keys = (await requestResult(
        database.transaction(store).objectStore(store).getAllKeys(),
      )) as IDBValidKey[];
      const saved = new Set(keys.map(String));
      return items.every((item) => saved.has(item.id));
    }),
  );
  return results.every(Boolean);
}

export async function importBackup(backup: LifeManualBackup, mode: ImportMode): Promise<void> {
  const database = await openDatabase();
  const previous = await exportBackup();
  const snapshotTransaction = database.transaction(SETTINGS_STORE, 'readwrite');
  snapshotTransaction.objectStore(SETTINGS_STORE).put(previous, PRE_IMPORT_BACKUP_KEY);
  await complete(snapshotTransaction);
  let committed = false;
  try {
    await writeBackup(database, backup, mode);
    committed = true;
    if (!(await containsImportedData(database, backup))) throw new Error('导入结果校验失败');
  } catch (error) {
    if (!committed) throw error;
    try {
      const savedSnapshot = await requestResult(
        database.transaction(SETTINGS_STORE).objectStore(SETTINGS_STORE).get(PRE_IMPORT_BACKUP_KEY),
      );
      const rollbackBackup = parseBackup(savedSnapshot ?? previous);
      await writeBackup(database, rollbackBackup, 'replace');
      if (!(await containsImportedData(database, rollbackBackup)))
        throw new Error('回滚结果校验失败');
    } catch {
      throw new Error('导入失败，自动回滚也未能完成，请重新载入应用并检查数据');
    }
    throw new Error(`导入失败，已恢复导入前的数据。${error instanceof Error ? error.message : ''}`);
  } finally {
    try {
      const cleanup = database.transaction(SETTINGS_STORE, 'readwrite');
      cleanup.objectStore(SETTINGS_STORE).delete(PRE_IMPORT_BACKUP_KEY);
      await complete(cleanup);
    } catch {
      /* 临时快照会在下次导入时覆盖，不影响本次导入结果 */
    }
  }
}

export async function getAttachmentUrl(id: string): Promise<string | undefined> {
  const database = await openDatabase();
  const file = (await requestResult(
    database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE).get(id),
  )) as Blob | undefined;
  return file ? URL.createObjectURL(file) : undefined;
}

export async function getAttachmentFiles(items: Attachment[]): Promise<PendingAttachment[]> {
  const database = await openDatabase();
  const store = database.transaction(ATTACHMENTS_STORE).objectStore(ATTACHMENTS_STORE);
  const files = await Promise.all(
    items.map(async (item) => {
      const blob = (await requestResult(store.get(item.id))) as Blob | undefined;
      if (!blob) return undefined;
      const file =
        blob instanceof File ? blob : new File([blob], item.name, { type: item.type || blob.type });
      return { ...item, file };
    }),
  );
  return files.filter((file): file is PendingAttachment => file !== undefined);
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
