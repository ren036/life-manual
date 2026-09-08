import type { TaskItem, TaskRepeatUnit } from './types';

export function localDateKey(date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function monthDayForRepeat(dueDate?: string, configured?: number): number {
  if (configured && configured >= 1 && configured <= 31) return Math.floor(configured);
  const day = dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? Number(dueDate.slice(8, 10)) : 1;
  return day >= 1 && day <= 31 ? day : 1;
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function monthlyDate(date: Date, months: number, day: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(day, lastDay));
  return first;
}

function weekStart(date: Date): Date {
  const result = new Date(date);
  const weekday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - weekday);
  return result;
}

function nextWeeklyDate(after: Date, anchor: Date, interval: number, weekdays: number[]): Date {
  const anchorWeek = weekStart(anchor).getTime();
  for (let offset = 1; offset <= interval * 14 + 7; offset += 1) {
    const candidate = addDays(after, offset);
    const weeks = Math.floor((weekStart(candidate).getTime() - anchorWeek) / 604800000);
    if (weeks >= 0 && weeks % interval === 0 && weekdays.includes(candidate.getDay()))
      return candidate;
  }
  return addDays(after, interval * 7);
}

export function nextTaskDueDate(task: TaskItem, today = localDateKey()): string | undefined {
  if (!task.repeat || task.repeat === '不重复') return undefined;
  const currentKey = task.dueDate || today;
  const current = parseDate(currentKey);
  const todayDate = parseDate(today);
  const anchor = parseDate(task.repeatAnchorDate || currentKey);
  const interval = Math.max(1, Math.floor(task.repeatInterval || 1));
  const unit: TaskRepeatUnit =
    task.repeat === '每天'
      ? '天'
      : task.repeat === '每周'
        ? '周'
        : task.repeat === '每月'
          ? '月'
          : task.repeatUnit || '天';
  const threshold =
    task.overduePolicy === '从完成日期顺延' && current < todayDate ? todayDate : current;
  let next: Date;
  if (unit === '天') {
    next = addDays(threshold, interval);
    if (task.overduePolicy !== '从完成日期顺延')
      while (next <= todayDate) next = addDays(next, interval);
  } else if (unit === '周') {
    const weekdays = task.repeatWeekdays?.length ? task.repeatWeekdays : [anchor.getDay()];
    next = nextWeeklyDate(
      threshold < todayDate ? todayDate : threshold,
      anchor,
      interval,
      weekdays,
    );
  } else {
    const day = monthDayForRepeat(task.repeatAnchorDate || currentKey, task.repeatMonthDay);
    next = monthlyDate(threshold, interval, day);
    if (task.overduePolicy !== '从完成日期顺延')
      while (next <= todayDate) next = monthlyDate(next, interval, day);
  }
  const value = localDateKey(next);
  return task.repeatEndDate && value > task.repeatEndDate ? undefined : value;
}

export function repeatLabel(task: TaskItem): string {
  if (!task.repeat || task.repeat === '不重复') return '';
  const interval = Math.max(1, task.repeatInterval || 1);
  if (task.repeat !== '自定义') return task.repeat;
  return `每 ${interval} ${task.repeatUnit || '天'}`;
}
