import { Radio, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import { isBackupOverdue } from '../dataSafety';
import { localDateKey } from '../dueDates';
import { clearAllData, exportBackup, importBackup, parseBackup } from '../storage/database';
import type { ImportMode } from '../storage/database';
import { errorToast, toast } from '../toast';
import type { AppTab } from '../types';
import type { AppStore } from './useAppData';

const LAST_BACKUP_KEY = 'life-manual-last-backup-at';
const BACKUP_BASELINE_KEY = 'life-manual-backup-baseline';
function backupBaseline() {
  const saved = Number(localStorage.getItem(BACKUP_BASELINE_KEY));
  if (Number.isFinite(saved) && saved > 0) return saved;
  const now = Date.now();
  localStorage.setItem(BACKUP_BASELINE_KEY, String(now));
  return now;
}

export function useBackup(
  { recipes, documents, tasks, notes, refresh }: AppStore,
  setTab: (tab: AppTab) => void,
  closePanel: () => void,
) {
  const [lastBackupAt, setLastBackupAt] = useState<number | undefined>(() => {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  });
  async function downloadBackup() {
    const backup = await exportBackup();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `生活手册备份-${localDateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const savedAt = Date.now();
    localStorage.setItem(LAST_BACKUP_KEY, String(savedAt));
    setLastBackupAt(savedAt);
    toast('备份文件已下载');
  }

  function confirmClearAllData() {
    modals.openConfirmModal({
      centered: true,
      title: '清空全部数据？',
      children: (
        <Stack gap="xs">
          <Text size="sm">所有菜谱、资料、待办、随记、附件和回收站内容都会被永久删除。</Text>
          <Text size="sm" c="red" fw={700}>
            此操作无法撤销，建议先导出完整备份。
          </Text>
        </Stack>
      ),
      labels: { confirm: '确认清空', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await clearAllData();
          localStorage.removeItem(LAST_BACKUP_KEY);
          const nextBaseline = Date.now();
          localStorage.setItem(BACKUP_BASELINE_KEY, String(nextBaseline));
          setLastBackupAt(undefined);
          await refresh();
          closePanel();
          setTab('home');
          toast('全部数据已清空');
        } catch {
          errorToast('清空失败，请重试');
        }
      },
    });
  }

  async function restoreBackup(file: File) {
    try {
      const backup = parseBackup(JSON.parse(await file.text()) as unknown);
      let importMode: ImportMode = 'merge';
      modals.openConfirmModal({
        centered: true,
        title: '选择导入方式',
        children: (
          <Stack gap="md">
            <Text size="sm">
              已验证：{backup.recipes.length} 道菜谱、{backup.documents.length} 份资料、
              {backup.tasks.length} 个待办、{backup.notes.length} 条随记、
              {backup.attachments.length} 个附件。导入前会自动创建临时快照，失败时自动回滚。
            </Text>
            <Radio.Group
              defaultValue="merge"
              onChange={(value) => {
                importMode = value as ImportMode;
              }}
            >
              <Stack gap="xs">
                <Radio value="merge" label="合并导入（保留本机其他数据，相同 ID 使用备份版本）" />
                <Radio value="replace" label="覆盖导入（清空本机数据后恢复）" />
              </Stack>
            </Radio.Group>
          </Stack>
        ),
        labels: { confirm: '开始导入', cancel: '取消' },
        confirmProps: { color: 'green' },
        onConfirm: async () => {
          try {
            await importBackup(backup, importMode);
            await refresh();
            setTab('home');
            closePanel();
            toast(importMode === 'merge' ? '备份已合并导入' : '备份已覆盖恢复');
          } catch (error) {
            errorToast(
              error instanceof Error ? `导入失败：${error.message}` : '导入失败，原数据已保留',
            );
          }
        },
      });
    } catch (error) {
      errorToast(
        error instanceof Error ? `备份无效：${error.message}` : '备份文件无效，未做任何修改',
      );
    }
  }

  const backupOverdue =
    recipes.length + documents.length + tasks.length + notes.length > 0 &&
    isBackupOverdue(lastBackupAt || backupBaseline());

  return { lastBackupAt, backupOverdue, downloadBackup, restoreBackup, confirmClearAllData };
}
