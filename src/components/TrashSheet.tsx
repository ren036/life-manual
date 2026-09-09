import { ActionIcon, Button, Drawer, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { BookHeart, CheckSquare, FileText, RotateCcw, Trash2, Utensils } from 'lucide-react';
import { trashDaysRemaining } from '../dataSafety';
import type { TrashEntry } from '../types';

const kindLabel = { recipe: '菜谱', document: '资料', task: '待办', note: '随记' } as const;

export function TrashSheet({
  open,
  entries,
  onClose,
  onRestore,
  onDelete,
  onEmpty,
}: {
  open: boolean;
  entries: TrashEntry[];
  onClose: () => void;
  onRestore: (entry: TrashEntry) => void;
  onDelete: (entry: TrashEntry) => void;
  onEmpty: () => void;
}) {
  return (
    <Drawer
      opened={open}
      onClose={onClose}
      title="回收站"
      position="bottom"
      size="min(88vh, 680px)"
      radius="xl"
      overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Text c="dimmed" size="sm">
            删除的内容保留 30 天，到期后会自动永久删除。
          </Text>
          {!!entries.length && (
            <Button color="red" variant="subtle" size="compact-sm" onClick={onEmpty}>
              清空
            </Button>
          )}
        </Group>
        {entries.map((entry) => (
          <Paper withBorder radius="lg" p="md" key={`${entry.kind}-${entry.item.id}`}>
            <Group wrap="nowrap">
              <ThemeIcon variant="light" radius="xl">
                {entry.kind === 'recipe' ? (
                  <Utensils size={18} />
                ) : entry.kind === 'document' ? (
                  <FileText size={18} />
                ) : entry.kind === 'note' ? (
                  <BookHeart size={18} />
                ) : (
                  <CheckSquare size={18} />
                )}
              </ThemeIcon>
              <Stack gap={1} flex={1}>
                <Text fw={650} lineClamp={1}>
                  {entry.item.title}
                </Text>
                <Text c="dimmed" size="xs">
                  {kindLabel[entry.kind]} · 剩余 {trashDaysRemaining(entry.item.deletedAt)} 天
                </Text>
              </Stack>
              <Group gap={2} wrap="nowrap">
                <ActionIcon
                  variant="light"
                  color="green"
                  onClick={() => onRestore(entry)}
                  aria-label={`恢复：${entry.item.title}`}
                >
                  <RotateCcw size={17} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onDelete(entry)}
                  aria-label={`永久删除：${entry.item.title}`}
                >
                  <Trash2 size={17} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))}
        {!entries.length && (
          <Paper bg="var(--mantine-color-default-hover)" radius="lg" p="xl" ta="center">
            <Text c="dimmed">回收站是空的。</Text>
          </Paper>
        )}
      </Stack>
    </Drawer>
  );
}
