import { Fieldset, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useRef, useState, type SetStateAction } from 'react';
import { useEditorDraft } from '../hooks/useEditorDraft';
import { EditorSheet } from './EditorSheet';
import type { CookingRecord, DraftAttachment, PendingAttachment } from '../types';
import { AttachmentPicker } from './AttachmentPicker';

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  recipeId: string;
  recipeTitle: string;
  initialRecord?: CookingRecord;
  onClose: () => void;
  onSave: (record: CookingRecord, files: PendingAttachment[]) => Promise<void>;
}

export function CookingRecordSheet(props: Props) {
  return props.open ? (
    <CookingEditor key={props.recipeId + ':' + (props.initialRecord?.id || 'new')} {...props} />
  ) : null;
}

function CookingEditor({ open, recipeTitle, recipeId, initialRecord, onClose, onSave }: Props) {
  const draft = useEditorDraft(
    'cooking:' + recipeId + ':' + (initialRecord?.id || 'new'),
    {
      date: initialRecord?.date || localDate(),
      notes: initialRecord?.notes || '',
      files: (initialRecord ? [...initialRecord.attachments] : []) as DraftAttachment[],
    },
    initialRecord,
  );
  const { date, notes, files } = draft.value;
  const setDate = (value: string) => draft.setField('date', value);
  const setNotes = (value: string) => draft.setField('notes', value);
  const setFiles = (value: SetStateAction<DraftAttachment[]>) => draft.setField('files', value);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  async function submit() {
    if ((!files.length && !notes.trim()) || savingRef.current || attachmentBusy || !draft.ready) {
      if (!files.length && !notes.trim()) setError('写一点心得或添加照片后再保存。');
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
      await draft.complete();
    } catch {
      setError('保存失败，内容已保留。请检查设备存储空间后重试。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <EditorSheet
      draft={draft}
      onClose={() => {
        if (!savingRef.current && !attachmentBusy && draft.ready) void draft.close(onClose);
      }}
      onSave={() => void submit()}
      saveLabel={initialRecord ? '保存修改' : '保存本次记录'}
      canSave={!!date && (!!files.length || !!notes.trim()) && !attachmentBusy}
      busy={saving || attachmentBusy}
      error={error}
      title={
        <Stack gap={0}>
          <Title order={3}>{initialRecord ? '编辑下厨记录' : '记录这次下厨'}</Title>
          <Text c="dimmed" size="xs">
            {recipeTitle} · 写心得或放照片都可以
          </Text>
        </Stack>
      }
    >
      <Fieldset disabled={saving || !draft.ready} variant="unstyled">
        <Stack gap="md">
          <TextInput
            type="date"
            required
            label="做菜日期"
            value={date}
            onInput={(event) => setDate(event.currentTarget.value)}
            onChange={(event) => setDate(event.currentTarget.value)}
          />
          <Textarea
            label="这次的心得"
            placeholder="例如：火候刚好，下次可以少放一点盐"
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
            minRows={3}
            autosize
          />
          <AttachmentPicker
            files={files}
            onBusyChange={setAttachmentBusy}
            enableCamera
            onChange={setFiles}
            imagesOnly
            label="添加照片"
          />
        </Stack>
      </Fieldset>
    </EditorSheet>
  );
}
