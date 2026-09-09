import {
  Badge,
  Button,
  Center,
  Group,
  Input,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { CalendarClock, FileText, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttachmentPreview } from '../components/AttachmentPreview';
import { dueLabel, dueStatus } from '../dueDates';
import type { DocumentItem } from '../types';
type SortMode = '最近添加' | '名称排序' | '到期优先';
export function DocumentsPage({
  documents,
  onOpen,
  onAdd,
}: {
  documents: DocumentItem[];
  onOpen: (item: DocumentItem) => void;
  onAdd: () => void;
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('最近添加');
  const categories = [
    { value: 'all', label: '全部' },
    { value: 'special:important', label: '重要' },
    { value: 'special:overdue', label: '已过期' },
    { value: 'special:within7', label: '7 天内' },
    { value: 'special:within30', label: '30 天内' },
    ...[...new Set(documents.map((item) => item.category))].map((category) => ({
      value: `category:${category}`,
      label: category,
    })),
    ...[...new Set(documents.flatMap((item) => item.tags || []))].map((tag) => ({
      value: `tag:${tag}`,
      label: `#${tag}`,
    })),
  ];
  const shown = useMemo(
    () =>
      documents
        .filter(
          (item) =>
            (filter === 'all' || filter === 'special:important'
              ? filter === 'all' || item.important
              : filter === 'special:overdue'
                ? dueStatus(item.expiryDate) === 'overdue'
                : filter === 'special:within7'
                  ? ['today', 'within7'].includes(dueStatus(item.expiryDate))
                  : filter === 'special:within30'
                    ? ['today', 'within7', 'within30'].includes(dueStatus(item.expiryDate))
                    : filter.startsWith('tag:')
                      ? item.tags?.includes(filter.slice(4))
                      : item.category === filter.slice(9)) &&
            `${item.title} ${item.description} ${item.ocrText || ''} ${item.category} ${(item.tags || []).join(' ')}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === '名称排序'
            ? a.title.localeCompare(b.title, 'zh-CN')
            : sort === '到期优先'
              ? (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999')
              : b.createdAt - a.createdAt,
        ),
    [documents, filter, query, sort],
  );
  return (
    <Stack gap="md">
      <Group wrap="nowrap" align="stretch" gap="sm">
        <TextInput
          flex={1}
          aria-label="搜索资料"
          leftSection={<Search size={18} strokeWidth={1.8} color="var(--mantine-color-green-8)" />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="搜索资料与标签"
          rightSection={
            query ? <Input.ClearButton aria-label="清除搜索" onClick={() => setQuery('')} /> : null
          }
        />
        <Select
          w={92}
          aria-label="资料排序"
          value={sort}
          onChange={(value) => setSort((value || '最近添加') as SortMode)}
          data={[
            { value: '最近添加', label: '最新' },
            { value: '名称排序', label: '名称' },
            { value: '到期优先', label: '到期' },
          ]}
          allowDeselect={false}
          radius="md"
        />
      </Group>
      <Group gap="xs" wrap="wrap">
        {categories.map((item) => (
          <Button
            key={item.value}
            size="compact-sm"
            radius="md"
            color={filter === item.value ? 'green' : 'gray'}
            variant={filter === item.value ? 'filled' : 'subtle'}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </Group>
      <Stack gap="sm">
        {shown.map((item) => (
          <Paper
            component="button"
            type="button"
            bd="none"
            shadow="xs"
            radius="lg"
            withBorder
            p="sm"
            bg="white"
            ta="left"
            key={item.id}
            onClick={() => onOpen(item)}
          >
            <Group wrap="nowrap">
              <Paper
                w={62}
                h={62}
                radius="md"
                bg="green.0"
                withBorder
                style={{ overflow: 'hidden' }}
              >
                {item.hasFile && item.isImage ? (
                  <AttachmentPreview
                    id={item.attachments?.[0]?.id || item.id}
                    enabled
                    alt={item.title}
                  />
                ) : (
                  <Center w="100%" h="100%">
                    <FileText color="var(--mantine-color-green-7)" />
                  </Center>
                )}
              </Paper>
              <Stack gap={3} flex={1}>
                <Group gap="xs">
                  <Badge variant="light" size="xs">
                    {item.category}
                  </Badge>
                  {item.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} color="yellow" variant="light" size="xs">
                      #{tag}
                    </Badge>
                  ))}
                </Group>
                <Text fw={700} lineClamp={1}>
                  {item.title}
                </Text>
                <Group gap={4} wrap="nowrap">
                  {item.expiryDate && <CalendarClock size={13} />}
                  <Text
                    size="xs"
                    c={dueStatus(item.expiryDate) === 'overdue' ? 'red' : 'dimmed'}
                    lineClamp={1}
                  >
                    {item.expiryDate
                      ? dueLabel(item.expiryDate)
                      : item.attachmentName || item.description || '暂无说明'}
                  </Text>
                </Group>
              </Stack>
              {item.important && (
                <ThemeIcon color="yellow" variant="light" radius="xl" aria-label="重要">
                  <Star size={17} fill="currentColor" />
                </ThemeIcon>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>
      {!shown.length && (
        <Paper bg="white" radius="lg" p="xl" ta="center" withBorder>
          <Stack align="center" gap="sm">
            <Text c="dimmed">{documents.length ? '这个分类还没有资料。' : '还没有保存资料。'}</Text>
            {!documents.length && <Button onClick={onAdd}>上传第一份资料</Button>}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
