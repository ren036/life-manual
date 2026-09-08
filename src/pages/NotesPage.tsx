import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { Mic, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getAttachmentUrl } from '../storage/database';
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
  const [filter, setFilter] = useState<'全部' | Mood>('全部');
  const shown = useMemo(
    () => notes.filter((note) => filter === '全部' || note.mood === filter),
    [notes, filter],
  );

  return (
    <Stack gap="lg">
      <Paper radius={28} p="xl" bg="grape.7" c="white">
        <Text size="xs" opacity={0.78}>
          你的私人角落
        </Text>
        <Text size="xl" fw={750} mt={4}>
          记下此刻，不必写得完整
        </Text>
        <Text size="sm" opacity={0.85} mt="xs">
          {notes.length} 条随记，都只保存在你的设备里
        </Text>
      </Paper>

      <SegmentedControl
        fullWidth
        size="xs"
        radius="xl"
        value={filter}
        onChange={(value) => setFilter(value as '全部' | Mood)}
        data={['全部', '开心', '平静', '低落', '焦虑', '生气']}
      />

      <Stack gap="md">
        {shown.map((note) => (
          <Paper component="article" bg="white" shadow="xs" radius="xl" p="lg" key={note.id}>
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2} flex={1}>
                  <Text fw={700}>{note.title}</Text>
                  <Text size="xs" c="dimmed">
                    {new Intl.DateTimeFormat('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(note.createdAt)}
                  </Text>
                </Stack>
                <Badge color="grape" variant="light" radius="xl">
                  {moodEmoji[note.mood]} {note.mood}
                </Badge>
              </Group>
              {note.content && (
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {note.content}
                </Text>
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
              <Group justify="flex-end" gap={2}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => onEdit(note)}
                  aria-label={`编辑：${note.title}`}
                >
                  <Pencil size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onDelete(note)}
                  aria-label={`删除：${note.title}`}
                >
                  <Trash2 size={16} />
                </ActionIcon>
              </Group>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {!shown.length && (
        <Paper bg="white" radius="xl" p="xl" ta="center">
          <Text c="dimmed" mb="md">
            {notes.length ? '这个心情下还没有随记。' : '还没有随记，今天感觉怎么样？'}
          </Text>
          {!notes.length && (
            <Button color="grape" onClick={onAdd}>
              写下第一条
            </Button>
          )}
        </Paper>
      )}
    </Stack>
  );
}
