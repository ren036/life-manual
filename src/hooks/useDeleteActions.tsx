import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  deleteRecord,
  deleteNote,
  deleteTask,
  getAttachmentFiles,
  insertTask,
  restoreRecord,
  updateRecord,
} from '../storage/database';
import { errorToast, toast } from '../toast';
import type { AppTab, CookingRecord, DocumentItem, NoteEntry, Recipe, TaskItem } from '../types';
import type { AppStore } from './useAppData';

function showUndo(message: string, success: string, undo: () => Promise<void>) {
  let id = '';
  id = notifications.show({
    message: (
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">{message}</Text>
        <Button
          variant="subtle"
          size="compact-sm"
          onClick={() => {
            void undo()
              .then(() => {
                notifications.hide(id);
                toast(success);
              })
              .catch(() => errorToast('撤销失败，请重试'));
          }}
        >
          撤销
        </Button>
      </Group>
    ),
    color: 'gray',
    radius: 'lg',
    withBorder: true,
    autoClose: 5000,
  });
}

export function useDeleteActions({ refresh }: AppStore, setTab: (tab: AppTab) => void) {
  async function removeNote(item: NoteEntry) {
    try {
      await deleteNote(item);
      await refresh();
      toast(`已删除随记“${item.title}”`);
    } catch {
      errorToast('删除失败，请重试');
    }
  }

  async function removeCookingRecord(recipe: Recipe, record: CookingRecord) {
    try {
      const files = await getAttachmentFiles(record.attachments);
      const updated: Recipe = {
        ...recipe,
        cookingRecords: (recipe.cookingRecords || []).filter((item) => item.id !== record.id),
      };
      await updateRecord(updated, recipe, []);
      await refresh();
      showUndo('已删除本次下厨记录', '下厨记录已恢复', async () => {
        await updateRecord(recipe, updated, files);
        await refresh();
      });
    } catch {
      errorToast('删除下厨记录失败，请重试');
    }
  }

  async function removeTask(item: TaskItem) {
    try {
      await deleteTask(item);
      await refresh();
      showUndo(`已删除待办“${item.title}”`, '待办已恢复', async () => {
        await insertTask(item);
        await refresh();
      });
    } catch {
      errorToast('删除失败，请重试');
    }
  }

  async function removeRecord(item: Recipe | DocumentItem) {
    try {
      await deleteRecord(item);
      await refresh();
      setTab('ingredients' in item ? 'recipes' : 'documents');
      showUndo(`已删除“${item.title}”及关联附件`, '记录和附件已恢复', async () => {
        await restoreRecord(item);
        await refresh();
      });
    } catch {
      errorToast('删除失败，请重试');
    }
  }

  return { removeNote, removeCookingRecord, removeTask, removeRecord };
}
