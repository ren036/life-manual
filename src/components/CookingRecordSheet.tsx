import { Button, Drawer, Fieldset, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import type { CookingRecord, DraftAttachment, PendingAttachment } from '../types';
import { AttachmentPicker } from './AttachmentPicker';

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function CookingRecordSheet({
  open,
  recipeTitle,
  initialRecord,
  onClose,
  onSave,
}: {
  open: boolean;
  recipeTitle: string;
  initialRecord?: CookingRecord;
  onClose: () => void;
  onSave: (record: CookingRecord, files: PendingAttachment[]) => Promise<void>;
}) {
  const [date, setDate] = useState(localDate);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<DraftAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setDate(initialRecord?.date || localDate());
    setNotes(initialRecord?.notes || '');
    setFiles(initialRecord ? [...initialRecord.attachments] : []);
    setError('');
  }, [open, initialRecord]);

  async function submit() {
    if (!files.length || savingRef.current) {
      if (!files.length) setError('请至少添加一张这次做菜的照片。');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const record: CookingRecord = {
        id: initialRecord?.id || crypto.randomUUID(),
        date,
        notes: notes.trim(),
        createdAt: initialRecord?.createdAt || Date.now(),
        attachments: files.map(({ id, name, type }) => ({ id, name, type })),
      };
      const pending = files.filter(
        (attachment): attachment is PendingAttachment => !!attachment.file,
      );
      await onSave(record, pending);
    } catch {
      setError('保存失败，内容已保留。请检查设备存储空间后重试。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Drawer
      opened={open}
      onClose={() => !savingRef.current && onClose()}
      position="bottom"
      size="78vh"
      radius="xl"
      title={
        <Stack gap={0}>
          <Title order={3}>{initialRecord ? '编辑下厨记录' : '记录这次下厨'}</Title>
          <Text c="dimmed" size="xs">
            {recipeTitle} · 每次的照片都会独立保留
          </Text>
        </Stack>
      }
      closeButtonProps={{ disabled: saving, 'aria-label': '关闭' }}
      overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Fieldset disabled={saving} variant="unstyled">
          <Stack gap="md">
            <TextInput
              type="date"
              required
              label="做菜日期"
              value={date}
              onChange={(event) => setDate(event.currentTarget.value)}
            />
            <Textarea
              label="这次的心得（可选）"
              placeholder="例如：火候刚好，下次可以少放一点盐"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
              minRows={3}
              autosize
            />
            <AttachmentPicker
              files={files}
              onChange={setFiles}
              imagesOnly
              label="添加这次的照片（可多选）"
            />
            {error && (
              <Text c="red" size="sm" role="alert">
                {error}
              </Text>
            )}
            <Button type="submit" fullWidth size="md" loading={saving} disabled={!files.length}>
              {initialRecord ? '保存修改' : '保存本次记录'}
            </Button>
          </Stack>
        </Fieldset>
      </form>
    </Drawer>
  );
}
