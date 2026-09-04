export type AppTab = 'home' | 'recipes' | 'documents' | 'tasks';
export type AddMode = Exclude<AppTab, 'home'>;

export interface Recipe {
  id: string;
  title: string;
  notes: string;
  ingredients: string[];
  category: string;
  date: string;
  createdAt: number;
  attachmentName?: string;
  hasFile?: boolean;
}

export interface DocumentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  important: boolean;
  date: string;
  createdAt: number;
  attachmentName?: string;
  hasFile?: boolean;
  isImage?: boolean;
}

export type TaskPriority = '普通' | '重要' | '紧急';

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  category: string;
  dueDate?: string;
  priority: TaskPriority;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface AppData {
  recipes: Recipe[];
  documents: DocumentItem[];
  tasks: TaskItem[];
}
