import { useRef, useState } from 'react';
import { nextTaskDueDate, planRecurringTaskReopen } from '../recurrence';
import { advanceTask, reopenRecurringTask, updateTask } from '../storage/database';
import { errorToast, toast } from '../toast';
import type { TaskItem } from '../types';
import type { AppStore } from './useAppData';

export function useTaskActions({ tasks, trashItems, refresh }: AppStore) {
  const pending = useRef(new Set<string>());
  const [busyTaskIds, setBusyTaskIds] = useState<Set<string>>(new Set());

  async function run(item: TaskItem, action: () => Promise<void>) {
    if (pending.current.has(item.id)) return;
    pending.current.add(item.id);
    setBusyTaskIds(new Set(pending.current));
    try {
      await action();
    } catch {
      errorToast('待办更新失败，请重试');
    } finally {
      pending.current.delete(item.id);
      setBusyTaskIds(new Set(pending.current));
    }
  }

  async function finishRecurring(item: TaskItem, skipped: boolean) {
    const updated: TaskItem = {
      ...item,
      completed: true,
      completedAt: Date.now(),
      skipped,
    };
    const dueDate = nextTaskDueDate(item);
    const next: TaskItem | undefined = dueDate
      ? {
          ...item,
          id: crypto.randomUUID(),
          completed: false,
          completedAt: undefined,
          skipped: undefined,
          dueDate,
          createdAt: Date.now(),
          generatedFromTaskId: item.id,
        }
      : undefined;

    await advanceTask(updated, next);
    await refresh();
    if (dueDate) {
      toast(skipped ? `已跳过本次，下一次：${dueDate}` : `已创建下一次：${dueDate}`);
    } else {
      toast(skipped ? '已跳过，本次重复计划到此结束' : '已完成，重复计划也已结束');
    }
  }

  async function toggleTask(item: TaskItem) {
    await run(item, async () => {
      const updated = {
        ...item,
        completed: !item.completed,
        completedAt: item.completed ? undefined : Date.now(),
        skipped: item.completed ? undefined : false,
      };
      if (item.completed && item.repeat) {
        const reopenPlan = planRecurringTaskReopen(
          item,
          tasks,
          trashItems.flatMap((entry) => (entry.kind === 'task' ? [entry.item] : [])),
        );
        if (reopenPlan.status === 'blocked-by-legacy-history') {
          errorToast('这个重复计划已有后续完成记录，不能直接恢复较早的一次');
          return;
        }
        if (reopenPlan.status === 'blocked-by-linked-history') {
          errorToast('后续待办已经完成或删除，不能直接恢复这一次');
          return;
        }
        if (reopenPlan.status === 'remove-successor') {
          await reopenRecurringTask(updated, reopenPlan.successor.id);
          await refresh();
          toast('已恢复，并撤销自动创建的下一次待办');
          return;
        }
        if (reopenPlan.status === 'blocked-by-trash') {
          errorToast('自动生成的下一次待办在回收站中，请先处理它再恢复这一次');
          return;
        }
      }
      if (!item.completed && item.repeat) {
        await finishRecurring(item, false);
        return;
      }
      await updateTask(updated);
      await refresh();
    });
  }

  async function skipTask(item: TaskItem) {
    await run(item, () => finishRecurring(item, true));
  }

  return { busyTaskIds, toggleTask, skipTask };
}
