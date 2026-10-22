import {
  Badge,
  Button,
  Group,
  Input,
  Paper,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { Mic, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getAttachmentUrl } from '../storage/database';
import { usePageState } from '../hooks/usePageState';
import { FilterChips } from '../components/CollectionToolbar';
import { RecordActionsMenu } from '../components/RecordActionsMenu';
import type { Mood, NoteEntry } from '../types';
const moodEmoji: Record<Mood, string> = {
  开心: '😄',
  平静: '😌',
  低落: '😔',
  焦虑: '😟',
  生气: '😤',
};
function NoteAudio({ id }: { id: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    void getAttachmentUrl(id).then((value) => {
      objectUrl = value || '';
      if (active) setUrl(objectUrl);
      else if (objectUrl) URL.revokeObjectURL(objectUrl);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url ? (
    <audio controls preload="metadata" src={url} style={{ width: '100%', height: 38 }} />
  ) : null;
}

export function NotesPage({
  notes,
  onAdd,
  onEdit,
  onDelete,
}: {
  notes: NoteEntry[];
  onAdd: () => void;
  onEdit: (note: NoteEntry) => void;
  onDelete: (note: NoteEntry) => void;
}) {
  const [filter, setFilter] = usePageState('notes:filter', '全部');
  const [query, setQuery] = usePageState('notes:query', '');
  const [expanded, setExpanded] = usePageState<string[]>('notes:expanded', []);
  const shown = useMemo(
    () =>
      notes.filter(
        (note) =>
          (filter === '全部' || note.mood === filter) &&
          [note.title, note.content, note.mood]
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [notes, filter, query],
  );
  return (
    <Stack gap="md">
      <TextInput
        aria-label="搜索随记"
        placeholder="搜索标题或正文"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<Search size={18} />}
        rightSection={
          query ? <Input.ClearButton aria-label="清除搜索" onClick={() => setQuery('')} /> : null
        }
      />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={['全部', ...Object.keys(moodEmoji)].map((value) => ({ value, label: value }))}
      />
      <Text size="xs" c="dimmed" role="status">
        {shown.length} 条随记
        {query.trim() || filter !== '全部' ? '符合条件' : '，只保存在你的设备里'}
      </Text>
      <Stack gap="sm">
        {shown.map((note) => (
          <Paper
            component="article"
            key={note.id}
            bg="var(--app-surface-soft)"
            radius="lg"
            withBorder
            p="md"
          >
            <Stack gap="sm">
              <Group wrap="nowrap" gap="xs" align="flex-start">
                <Stack gap={2} miw={0} flex={1}>
                  <UnstyledButton
                    mih={44}
                    onClick={() => onEdit(note)}
                    aria-label={'编辑随记：' + note.title}
                  >
                    <Text fw={700}>{note.title}</Text>
                  </UnstyledButton>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      {new Intl.DateTimeFormat('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(note.createdAt)}
                    </Text>
                    <Badge color="blue" variant="light" radius="xl">
                      {moodEmoji[note.mood]} {note.mood}
                    </Badge>
                  </Group>
                </Stack>
                <RecordActionsMenu
                  title={note.title}
                  onEdit={() => onEdit(note)}
                  onDelete={() => onDelete(note)}
                />
              </Group>
              {note.content && (
                <Text
                  size="sm"
                  lineClamp={expanded.includes(note.id) ? undefined : 5}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {note.content}
                </Text>
              )}
              {(note.content.length > 180 || note.content.split('\n').length > 5) && (
                <Button
                  variant="subtle"
                  color="blue"
                  size="compact-sm"
                  w="fit-content"
                  onClick={() =>
                    setExpanded((ids) =>
                      ids.includes(note.id)
                        ? ids.filter((id) => id !== note.id)
                        : [...ids, note.id],
                    )
                  }
                >
                  {expanded.includes(note.id) ? '收起正文' : '展开正文'}
                </Button>
              )}
              {note.audio && (
                <Stack gap={4}>
                  <Group gap={5}>
                    <Mic size={14} />
                    <Text size="xs" c="dimmed">
                      语音记录
                    </Text>
                  </Group>
                  <NoteAudio id={note.audio.id} />
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
      {!shown.length && (
        <Paper bg="var(--app-surface)" radius="lg" p="lg" ta="center" withBorder>
          <Stack align="center" gap="sm">
            <Text c="dimmed">
              {notes.length ? '没有符合当前搜索和心情的随记。' : '还没有随记，今天感觉怎么样？'}
            </Text>
            {(query.trim() || filter !== '全部') && (
              <Button
                variant="light"
                color="blue"
                onClick={() => {
                  setQuery('');
                  setFilter('全部');
                }}
              >
                清除搜索和筛选
              </Button>
            )}
            {!notes.length && (
              <Button color="blue" onClick={onAdd}>
                写下第一条
              </Button>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
