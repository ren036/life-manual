import type { TaskItem } from './types';

export type DueStatus = 'overdue' | 'today' | 'within7' | 'within30' | 'later' | 'none';

export function localDateKey(date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function daysFromDate(value?: string, today = localDateKey()): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const due = new Date(`${value}T00:00:00`);
  const reference = new Date(`${today}T00:00:00`);
  if (Number.isNaN(due.getTime()) || Number.isNaN(reference.getTime())) return undefined;
  return Math.round((due.getTime() - reference.getTime()) / 86400000);
}

export function dueStatus(value?: string, today = localDateKey()): DueStatus {
  const days = daysFromDate(value, today);
  if (days === undefined) return 'none';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'within7';
  if (days <= 30) return 'within30';
  return 'later';
}

export function dueLabel(value?: string, today = localDateKey()): string {
  const days = daysFromDate(value, today);
  if (days === undefined) return '没有截止日期';
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `${days} 天后到期`;
}

const priorityRank: Record<TaskItem['priority'], number> = { 紧急: 0, 重要: 1, 普通: 2 };

export function compareTasksByDueDate(a: TaskItem, b: TaskItem): number {
  if (a.completed || b.completed) {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt);
  }
  if (a.dueDate && b.dueDate) {
    const byDate = a.dueDate.localeCompare(b.dueDate);
    if (byDate) return byDate;
  } else if (a.dueDate || b.dueDate) {
    return a.dueDate ? -1 : 1;
  }
  return priorityRank[a.priority] - priorityRank[b.priority] || b.createdAt - a.createdAt;
}
