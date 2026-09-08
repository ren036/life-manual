export type AppTab = 'home' | 'notes' | 'recipes' | 'documents' | 'tasks';
export type AddMode = 'recipes' | 'documents' | 'tasks';

export interface Attachment {
  id: string;
  name: string;
  type: string;
}

export interface DraftAttachment extends Attachment {
  file?: File;
}
export interface PendingAttachment extends Attachment {
  file: File;
}

export interface RecordStep {
  id: string;
  text: string;
  attachments: Attachment[];
}

export interface RecordContent {
  tags?: string[];
  attachments?: Attachment[];
  steps?: RecordStep[];
}

export interface CookingRecord {
  id: string;
  date: string;
  notes: string;
  attachments: Attachment[];
  createdAt: number;
}

export interface Recipe extends RecordContent {
  id: string;
  title: string;
  notes: string;
  ingredients: string[];
  category: string;
  favorite?: boolean;
  date: string;
  createdAt: number;
  attachmentName?: string;
  hasFile?: boolean;
  cookingRecords?: CookingRecord[];
  deletedAt?: number;
}

export interface DocumentItem extends RecordContent {
  id: string;
  title: string;
  description: string;
  category: string;
  important: boolean;
  date: string;
  expiryDate?: string;
  ocrText?: string;
  createdAt: number;
  attachmentName?: string;
  hasFile?: boolean;
  isImage?: boolean;
  deletedAt?: number;
}

export type TaskPriority = '普通' | '重要' | '紧急';
export type TaskRepeat = '不重复' | '每天' | '每周' | '每月' | '自定义';
export type TaskRepeatUnit = '天' | '周' | '月';
export type TaskOverduePolicy = '按原计划顺延' | '从完成日期顺延';

export interface RelatedRecordRef {
  kind: 'recipe' | 'document';
  id: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  category: string;
  tags?: string[];
  dueDate?: string;
  priority: TaskPriority;
  repeat?: TaskRepeat;
  repeatInterval?: number;
  repeatUnit?: TaskRepeatUnit;
  repeatWeekdays?: number[];
  repeatMonthDay?: number;
  repeatEndDate?: string;
  repeatAnchorDate?: string;
  overduePolicy?: TaskOverduePolicy;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  skipped?: boolean;
  generatedFromTaskId?: string;
  relatedRecord?: RelatedRecordRef;
  deletedAt?: number;
}

export type Mood = '开心' | '平静' | '低落' | '焦虑' | '生气';

export interface NoteEntry {
  id: string;
  title: string;
  content: string;
  mood: Mood;
  audio?: Attachment;
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
}

export type TrashEntry =
  | { kind: 'recipe'; item: Recipe & { deletedAt: number } }
  | { kind: 'document'; item: DocumentItem & { deletedAt: number } }
  | { kind: 'task'; item: TaskItem & { deletedAt: number } }
  | { kind: 'note'; item: NoteEntry & { deletedAt: number } };

export interface AppData {
  recipes: Recipe[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  notes: NoteEntry[];
}
