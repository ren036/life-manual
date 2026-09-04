export type RecordKind = '菜品' | '维修' | '文件' | '图片' | '通用';
export type AppTab = 'home' | 'search' | 'food' | 'library';

export interface LifeRecord {
  id: string;
  kind: RecordKind;
  title: string;
  detail: string;
  date: string;
  createdAt: number;
  ingredients?: string[];
  attachmentName?: string;
  hasFile?: boolean;
}
