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
  const pendingCount = tasks.filter((item) => !item.completed).length;
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
    <Stack gap="lg">
      <Paper radius={28} p="xl" bg="green.8" c="white">
        <Group justify="space-between">
          <Stack gap={2}>
            <Text size="xs" opacity={0.78}>
              还要做
            </Text>
            <Group gap={7} align="baseline">
              <Title order={2} size="h1" lh={1}>
                {pendingCount}
              </Title>
              <Text size="sm" fw={650}>
                件事情
              </Text>
            </Group>
          </Stack>
          <ThemeIcon size={52} variant="white" color="green">
            <CalendarDays size={25} />
          </ThemeIcon>
        </Group>
      </Paper>

      <SegmentedControl
        fullWidth
        color="green"
        radius="xl"
        size="md"
        value={view}
        onChange={(value) => setView(value as '进行中' | '已完成')}
        data={['进行中', '已完成']}
      />

      {view === '进行中' && (
        <SegmentedControl
          fullWidth
          size="xs"
          radius="xl"
          value={filter}
          onChange={(value) => setFilter(value as '全部' | '今天' | '逾期' | '紧急')}
          data={['全部', '今天', '逾期', '紧急']}
        />
      )}

      <Stack gap="md">
        {shown.map((item) => (
          <Paper component="article" bg="white" shadow="xs" radius="xl" p="lg" key={item.id}>
            <Group wrap="nowrap" align="flex-start">
              <ActionIcon
                variant={item.completed ? 'filled' : 'light'}
                color="green"
                size={38}
                onClick={() => onToggle(item)}
                aria-label={item.completed ? '恢复待办' : '完成待办'}
              >
                {item.completed ? <Check size={18} /> : <Circle size={20} />}
              </ActionIcon>

              <Stack gap={6} flex={1}>
                <Group gap="xs" justify="space-between" align="flex-start">
                  <Text fw={700} lh={1.35} td={item.completed ? 'line-through' : undefined}>
                    {item.title}
                  </Text>
                  <Badge color={priorityColor[item.priority]} variant="light" radius="xl">
                    {item.priority}
                  </Badge>
                </Group>

                <Text size="sm" c="dimmed" lineClamp={2}>
                  {item.notes || item.category}
                </Text>

                <Group justify="space-between" gap="xs" align="center">
                  <Text size="xs" c="dimmed">
                    {item.category} · {dueLabel(item.dueDate)}
                    {item.repeat ? ` · ${item.repeat}` : ''}
                  </Text>
                  <Group gap={2} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => onEdit(item)}
                      aria-label={`编辑：${item.title}`}
                    >
                      <Pencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => onDelete(item)}
                      aria-label={`删除：${item.title}`}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Stack>
            </Group>
          </Paper>
        ))}
      </Stack>

      {!shown.length && (
        <Paper bg="white" radius="xl" p="xl" ta="center">
          <Text c="dimmed">这里暂时是空的。</Text>
        </Paper>
      )}
    </Stack>
  );
}
