import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { emptyTrash, permanentlyDeleteTrashEntry, restoreTrashEntry } from '../storage/database';
import { errorToast, toast } from '../toast';
import type { TrashEntry } from '../types';
import type { AppStore } from './useAppData';

export function useTrash({ refresh }: AppStore, onOpen: () => void) {
  async function openTrash() {
    try {
      await refresh();
      onOpen();
    } catch {
      errorToast('回收站读取失败，请重试');
    }
  }
  async function restoreFromTrash(entry: TrashEntry) {
    try {
      await restoreTrashEntry(entry);
      await refresh();
      toast('内容已恢复');
    } catch {
      errorToast('恢复失败，请检查设备存储空间');
    }
  }
  function permanentlyRemoveFromTrash(entry: TrashEntry) {
    modals.openConfirmModal({
      centered: true,
      title: '永久删除？',
      children: <Text size="sm">“{entry.item.title}”及其附件将无法恢复。</Text>,
      labels: { confirm: '永久删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await permanentlyDeleteTrashEntry(entry);
          await refresh();
          toast('已永久删除');
        } catch {
          errorToast('永久删除失败，请重试');
        }
      },
    });
  }
  function confirmEmptyTrash() {
    modals.openConfirmModal({
      centered: true,
      title: '清空回收站？',
      children: <Text size="sm">回收站中的所有内容和附件都将无法恢复。</Text>,
      labels: { confirm: '清空', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await emptyTrash();
          await refresh();
          toast('回收站已清空');
        } catch {
          errorToast('清空失败，请重试');
        }
      },
    });
  }
  return { openTrash, restoreFromTrash, permanentlyRemoveFromTrash, confirmEmptyTrash };
}
