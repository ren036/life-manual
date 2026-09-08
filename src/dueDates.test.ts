import { describe, expect, it } from 'vitest';
import { compareTasksByDueDate, daysFromDate, dueStatus } from './dueDates';
import type { TaskItem } from './types';

const today = '2026-09-08';

function task(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: crypto.randomUUID(),
    title: '测试待办',
    notes: '',
    category: '生活',
    priority: '普通',
    completed: false,
    createdAt: 1,
    ...overrides,
  };
}

describe('到期状态', () => {
  it('区分已过期、今天、7 天内、30 天内和更晚', () => {
    expect(dueStatus('2026-09-07', today)).toBe('overdue');
    expect(dueStatus('2026-09-08', today)).toBe('today');
    expect(dueStatus('2026-09-15', today)).toBe('within7');
    expect(dueStatus('2026-10-08', today)).toBe('within30');
    expect(dueStatus('2026-10-09', today)).toBe('later');
  });

  it('无效日期不会被当作即将到期', () => {
    expect(daysFromDate(undefined, today)).toBeUndefined();
    expect(dueStatus('not-a-date', today)).toBe('none');
  });
});

describe('待办排序', () => {
  it('截止日期优先，无日期待办排在最后', () => {
    const items = [
      task({ title: '无日期', priority: '紧急' }),
      task({ title: '明天', dueDate: '2026-09-09' }),
      task({ title: '逾期', dueDate: '2026-09-07' }),
    ].sort(compareTasksByDueDate);
    expect(items.map((item) => item.title)).toEqual(['逾期', '明天', '无日期']);
  });

  it('同一天按优先级排序', () => {
    const items = [
      task({ title: '普通', dueDate: today, priority: '普通' }),
      task({ title: '紧急', dueDate: today, priority: '紧急' }),
    ].sort(compareTasksByDueDate);
    expect(items.map((item) => item.title)).toEqual(['紧急', '普通']);
  });
});
