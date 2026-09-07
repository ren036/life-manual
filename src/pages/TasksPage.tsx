import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { CalendarDays, Check, Circle, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TaskItem } from '../types';
function dueLabel(value?: string) {
  if (!value) return '没有截止日期';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  if (due.getTime() === today.getTime()) return '今天截止';
  if (due < today) return '已逾期';
  return `${due.getMonth() + 1} 月 ${due.getDate()} 日`;
}
const priorityColor = { 普通: 'gray', 重要: 'orange', 紧急: 'red' } as const;
export function TasksPage({
  tasks,
  onToggle,
  onEdit,
  onDelete,
}: {
  tasks: TaskItem[];
  onToggle: (item: TaskItem) => void;
  onEdit: (item: TaskItem) => void;
  onDelete: (item: TaskItem) => void;
}) {
  const [view, setView] = useState<'进行中' | '已完成'>('进行中');
  const [filter, setFilter] = useState<'全部' | '今天' | '逾期' | '紧急'>('全部');
  const shown = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks
      .filter((item) => item.completed === (view === '已完成'))
      .filter((item) => {
        if (filter === '全部') return true;
        if (filter === '紧急') return item.priority === '紧急';
        if (!item.dueDate) return false;
        const due = new Date(`${item.dueDate}T00:00:00`);
        return filter === '今天' ? due.getTime() === today.getTime() : due < today;
      });
  }, [tasks, view, filter]);
  return (
    <Stack gap="md">
      <Paper radius="xl" p="lg" bg="green.7" c="white">
        <Group justify="space-between">
          <Stack gap={0}>
            <Text size="xs" opacity={0.8}>
              还要做
            </Text>
            <Group gap={6} align="baseline">
              <Title order={2}>{tasks.filter((item) => !item.completed).length}</Title>
              <Text size="sm">件事情</Text>
            </Group>
          </Stack>
          <ThemeIcon size="xl" radius="xl" variant="white" color="green">
            <CalendarDays />
          </ThemeIcon>
        </Group>
      </Paper>
      <SegmentedControl
        fullWidth
        color="green"
        value={view}
        onChange={(value) => setView(value as '进行中' | '已完成')}
        data={['进行中', '已完成']}
      />
      {view === '进行中' && (
        <SegmentedControl
          fullWidth
          size="xs"
          value={filter}
          onChange={(value) => setFilter(value as '全部' | '今天' | '逾期' | '紧急')}
          data={['全部', '今天', '逾期', '紧急']}
        />
      )}
      <Stack gap="sm">
        {shown.map((item) => (
          <Paper component="article" withBorder radius="lg" p="md" key={item.id}>
            <Group wrap="nowrap" align="flex-start">
              <ActionIcon
                variant={item.completed ? 'filled' : 'subtle'}
                color="green"
                radius="xl"
                onClick={() => onToggle(item)}
                aria-label={item.completed ? '恢复待办' : '完成待办'}
              >
                {item.completed ? <Check size={18} /> : <Circle size={20} />}
              </ActionIcon>
              <Stack gap={4} flex={1}>
                <Group gap="xs" justify="space-between" wrap="nowrap">
                  <Text fw={650} td={item.completed ? 'line-through' : undefined}>
                    {item.title}
                  </Text>
                  <Badge color={priorityColor[item.priority]} variant="light">
                    {item.priority}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {item.notes || item.category}
                </Text>
                <Text size="xs" c="dimmed">
                  {item.category} · {dueLabel(item.dueDate)}
                  {item.repeat ? ` · ${item.repeat}` : ''}
                </Text>
              </Stack>
              <Stack gap={4}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => onEdit(item)}
                  aria-label={`编辑：${item.title}`}
                >
                  <Pencil size={17} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onDelete(item)}
                  aria-label={`删除：${item.title}`}
                >
                  <Trash2 size={17} />
                </ActionIcon>
              </Stack>
            </Group>
          </Paper>
        ))}
      </Stack>
      {!shown.length && (
        <Text ta="center" c="dimmed" py="xl">
          这里暂时是空的。
        </Text>
      )}
    </Stack>
  );
}
