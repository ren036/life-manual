export type AppTab = 'home' | 'recipes' | 'documents' | 'tasks';
export type AddMode = Exclude<AppTab, 'home'>;

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
}

export interface DocumentItem extends RecordContent {
  id: string;
  title: string;
  description: string;
  category: string;
  important: boolean;
  date: string;
  expiryDate?: string;
  createdAt: number;
  attachmentName?: string;
  hasFile?: boolean;
  isImage?: boolean;
}

export type TaskPriority = '普通' | '重要' | '紧急';
export type TaskRepeat = '不重复' | '每天' | '每周' | '每月';

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  category: string;
  dueDate?: string;
  priority: TaskPriority;
  repeat?: TaskRepeat;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface AppData {
  recipes: Recipe[];
  documents: DocumentItem[];
  tasks: TaskItem[];
}
