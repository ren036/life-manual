import { PageHeading } from '../components/PageHeading';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Input,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { Check, Circle, Link2, Plus, Search } from 'lucide-react';
import { useMemo } from 'react';
import { compareTasksByDueDate, dueStatus, taskDueLabel } from '../dueDates';
import { repeatLabel } from '../recurrence';
import { relatedRecordKey } from '../relatedRecords';
import { FilterChips } from '../components/CollectionToolbar';
import { RecordActionsMenu } from '../components/RecordActionsMenu';
import { usePageState } from '../hooks/usePageState';
import type { RelatedRecordRef, TaskItem } from '../types';
const priorityColor = { 普通: 'gray', 重要: 'orange', 紧急: 'red' } as const;
export function TasksPage({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onSkip,
  onAdd,
  relatedRecordLabels,
  onOpenRelated,
  busyTaskIds,
}: {
  tasks: TaskItem[];
  onToggle: (item: TaskItem) => void;
  onEdit: (item: TaskItem) => void;
  onDelete: (item: TaskItem) => void;
  onSkip: (item: TaskItem) => void;
  onAdd: () => void;
  relatedRecordLabels: Record<string, string>;
  onOpenRelated: (reference: RelatedRecordRef) => void;
  busyTaskIds: Set<string>;
}) {
  const [view, setView] = usePageState<'进行中' | '已完成'>('tasks:view', '进行中');
  const [filter, setFilter] = usePageState('tasks:filter', '全部');
  const [query, setQuery] = usePageState('tasks:query', '');
  const pendingCount = tasks.filter((item) => !item.completed).length;
  const shown = useMemo(
    () =>
      tasks
        .filter((item) => item.completed === (view === '已完成'))
        .filter((item) => {
          if (view === '已完成' || filter === '全部') return true;
          if (filter === '紧急') return item.priority === '紧急';
          const status = dueStatus(item.dueDate);
          return filter === '今天' ? status === 'today' : status === 'overdue';
        })
        .filter((item) =>
          [item.title, item.notes, item.category, ...(item.tags || [])]
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .sort(compareTasksByDueDate),
    [tasks, view, filter, query],
  );
  return (
    <Stack className="task-page" gap="md">
      <PageHeading
        title="待办"
        description="日常要做的事，放在这里"
        action={
          <Button variant="light" size="sm" leftSection={<Plus size={17} />} onClick={onAdd}>
            新建
          </Button>
        }
      />
      <Group justify="space-between">
        <Text fw={700}>待完成 {pendingCount} 件</Text>
        <Text size="xs" c="dimmed">
          已完成 {tasks.length - pendingCount} 件
        </Text>
      </Group>
      <TextInput
        aria-label="搜索待办"
        placeholder="搜索待办、备注或标签"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<Search size={18} />}
        rightSection={
          query ? <Input.ClearButton aria-label="清除搜索" onClick={() => setQuery('')} /> : null
        }
      />
      <SegmentedControl
        fullWidth
        color="blue"
        radius="md"
        size="md"
        value={view}
        onChange={(value) => setView(value as '进行中' | '已完成')}
        data={['进行中', '已完成']}
      />
      {view === '进行中' && (
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={['全部', '今天', '逾期', '紧急'].map((value) => ({ value, label: value }))}
        />
      )}
      <Text size="xs" c="dimmed" role="status">
        {shown.length} 件{view === '已完成' ? '已完成事项' : '待办'}
      </Text>
      <Stack gap="sm">
        {shown.map((item) => (
          <Paper
            component="article"
            key={item.id}
            bg="var(--app-surface)"
            radius="lg"
            withBorder
            p="sm"
          >
            <Group wrap="nowrap" gap="sm" align="flex-start">
              <ActionIcon
                variant={item.completed ? 'filled' : 'light'}
                color="blue"
                size={44}
                loading={busyTaskIds.has(item.id)}
                disabled={busyTaskIds.has(item.id)}
                onClick={() => onToggle(item)}
                aria-label={(item.completed ? '恢复待办：' : '完成待办：') + item.title}
              >
                {item.completed ? <Check size={20} /> : <Circle size={22} />}
              </ActionIcon>
              <Stack gap={6} flex={1} miw={0}>
                <UnstyledButton
                  mih={44}
                  onClick={() => onEdit(item)}
                  aria-label={'编辑待办：' + item.title}
                >
                  <Text fw={700} lh={1.4} td={item.completed ? 'line-through' : undefined}>
                    {item.title}
                    {item.skipped ? '（已跳过）' : ''}
                  </Text>
                </UnstyledButton>
                {item.notes && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {item.notes}
                  </Text>
                )}
                <Group gap={4}>
                  {item.priority !== '普通' && (
                    <Badge color={priorityColor[item.priority]} variant="light" size="sm">
                      {item.priority}
                    </Badge>
                  )}
                  {item.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} size="xs" color="yellow" variant="light">
                      #{tag}
                    </Badge>
                  ))}
                </Group>
                {item.relatedRecord && (
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    px={0}
                    maw="100%"
                    w="fit-content"
                    leftSection={<Link2 size={15} />}
                    disabled={!relatedRecordLabels[relatedRecordKey(item.relatedRecord)]}
                    onClick={() => onOpenRelated(item.relatedRecord!)}
                  >
                    {relatedRecordLabels[relatedRecordKey(item.relatedRecord)] || '关联内容已删除'}
                  </Button>
                )}
                <Text
                  size="xs"
                  c={!item.completed && dueStatus(item.dueDate) === 'overdue' ? 'red' : 'dimmed'}
                >
                  {item.category} · {taskDueLabel(item.dueDate)}
                  {item.repeat ? ' · ' + repeatLabel(item) : ''}
                </Text>
              </Stack>
              <RecordActionsMenu
                title={item.title}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
                onSkip={!item.completed && item.repeat ? () => onSkip(item) : undefined}
                disabled={busyTaskIds.has(item.id)}
              />
            </Group>
          </Paper>
        ))}
      </Stack>
      {!shown.length && (
        <Paper bg="var(--app-surface)" radius="lg" p="lg" ta="center" withBorder>
          <Stack align="center" gap="sm">
            <Text c="dimmed">
              {query.trim() || (view === '进行中' && filter !== '全部')
                ? '没有符合当前搜索和筛选的待办。'
                : view === '已完成'
                  ? '还没有已完成的事项。'
                  : '暂时没有待办，想到了就记下来。'}
            </Text>
            {(query.trim() || (view === '进行中' && filter !== '全部')) && (
              <Button
                variant="light"
                onClick={() => {
                  setQuery('');
                  setFilter('全部');
                }}
              >
                清除搜索和筛选
              </Button>
            )}
            {!tasks.length && <Button onClick={onAdd}>新建第一个待办</Button>}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
