import {
  Button,
  Fieldset,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { Mic, MicOff, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Mood, NoteEntry, PendingAttachment } from '../types';
import { useEditorDraft } from '../hooks/useEditorDraft';
import { EditorSheet } from './EditorSheet';

interface SpeechResultEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: { [index: number]: { transcript: string }; isFinal: boolean };
    length: number;
  };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const moodData = ['😄 开心', '😌 平静', '😔 低落', '😟 焦虑', '😤 生气'];
const moodFromLabel = (value: string) => value.slice(3) as Mood;

interface Props {
  open: boolean;
  initialNote?: NoteEntry;
  onClose: () => void;
  onSave: (note: NoteEntry, audio?: PendingAttachment) => Promise<void>;
}
export function NoteSheet(props: Props) {
  return props.open ? <NoteEditor key={props.initialNote?.id || 'new'} {...props} /> : null;
}
function NoteEditor({ open, initialNote, onClose, onSave }: Props) {
  const draft = useEditorDraft(
    'note:' + (initialNote?.id || 'new'),
    {
      title: initialNote?.title || '',
      content: initialNote?.content || '',
      mood: (initialNote?.mood || '平静') as Mood,
      audio: undefined as PendingAttachment | undefined,
    },
    initialNote,
  );
  const { title, content, mood, audio } = draft.value;
  const setTitle = (value: string) => draft.setField('title', value);
  const setContent = (value: React.SetStateAction<string>) => draft.setField('content', value);
  const setMood = (value: Mood) => draft.setField('mood', value);
  const setAudio = (value: PendingAttachment | undefined) => draft.setField('audio', value);
  const [mediaStarting, setMediaStarting] = useState(false);
  const [recordingStopping, setRecordingStopping] = useState(false);
  const savingRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const recognitionRef = useRef<SpeechRecognitionLike | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function toggleRecording() {
    if (recording) {
      setRecordingStopping(true);
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      setError('当前浏览器不支持录音，请换用最新版 Chrome、Edge 或 Safari。');
      return;
    }
    setMediaStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type });
        const id = crypto.randomUUID();
        setAudio({
          id,
          name: `随记录音-${new Date().toLocaleString('zh-CN')}.${extension}`,
          type,
          file: new File([blob], `note-${id}.${extension}`, { type }),
        });
        stream.getTracks().forEach((track) => track.stop());
        setRecordingStopping(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setError('');
    } catch {
      setError('没有获得麦克风权限，请在浏览器设置中允许后重试。');
    } finally {
      setMediaStarting(false);
    }
  }

  function toggleDictation() {
    if (dictating) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError('当前浏览器不支持语音转文字；你仍然可以录音并保存。建议使用 Chrome 或 Edge。');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) transcript += event.results[index][0].transcript;
      }
      if (transcript) setContent((current) => `${current}${current ? '\n' : ''}${transcript}`);
    };
    recognition.onerror = () => setError('语音识别没有成功，请检查网络或麦克风权限。');
    recognition.onend = () => setDictating(false);
    recognitionRef.current = recognition;
    recognition.start();
    setDictating(true);
    setError('');
  }

  const mediaBusy = recording || dictating || mediaStarting || recordingStopping;
  async function save() {
    if (savingRef.current || mediaBusy || !draft.ready) return;
    if (!content.trim() && !audio && !initialNote?.audio) {
      setError('写一点内容或录一段语音后再保存。');
      return;
    }
    const now = Date.now();
    const cleanContent = content.trim();
    const note: NoteEntry = {
      id: initialNote?.id || crypto.randomUUID(),
      title: title.trim() || cleanContent.split('\n')[0].slice(0, 24) || '一段语音随记',
      content: cleanContent,
      mood,
      audio: audio ? { id: audio.id, name: audio.name, type: audio.type } : initialNote?.audio,
      createdAt: initialNote?.createdAt || now,
      updatedAt: initialNote ? now : undefined,
    };
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(note, audio);
      await draft.complete();
    } catch {
      setError('保存失败，请重试。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <EditorSheet
      draft={draft}
      color="blue"
      onClose={() => {
        if (!savingRef.current && !mediaBusy && draft.ready) void draft.close(onClose);
      }}
      onSave={() => void save()}
      saveLabel="保存随记"
      canSave={!!(content.trim() || audio || initialNote?.audio) && !mediaBusy}
      busy={saving || mediaBusy}
      error={error}
      title={initialNote ? '编辑随记' : '记一下'}
    >
      <Fieldset variant="unstyled" disabled={saving || !draft.ready}>
        <Stack gap="md">
          <Textarea
            label="想说的话"
            placeholder="写下来，或者用下面的语音转文字…"
            minRows={6}
            autosize
            value={content}
            onChange={(event) => setContent(event.currentTarget.value)}
          />
          <Group grow>
            <Button
              type="button"
              mih={44}
              color={dictating ? 'red' : 'blue'}
              variant={dictating ? 'filled' : 'light'}
              leftSection={dictating ? <MicOff size={18} /> : <Sparkles size={18} />}
              onClick={toggleDictation}
            >
              {dictating ? '停止转写' : '语音转文字'}
            </Button>
            <Button
              type="button"
              mih={44}
              color={recording ? 'red' : 'blue'}
              variant={recording ? 'filled' : 'light'}
              leftSection={recording ? <MicOff size={18} /> : <Mic size={18} />}
              onClick={() => void toggleRecording()}
            >
              {recording ? '结束录音' : '录一段语音'}
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            语音转文字的可用性取决于浏览器；录音和随记会保存在本机，并随备份一起导出。
          </Text>
          <details className="note-options">
            <summary>标题与心情（选填）</summary>
            <Stack gap="md" mt="md">
              <TextInput
                label="标题（选填）"
                placeholder="不填会自动取正文第一句"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
              <SegmentedControl
                aria-label="心情"
                fullWidth
                size="xs"
                color="blue"
                value={`${moodData.find((item) => item.endsWith(mood))}`}
                onChange={(value) => setMood(moodFromLabel(value))}
                data={moodData}
              />
            </Stack>
          </details>
          {audio && (
            <Group
              justify="space-between"
              p="sm"
              bg="var(--mantine-color-blue-light)"
              style={{ borderRadius: 12 }}
            >
              <Text size="sm">已录好一段语音</Text>
              <Button
                type="button"
                mih={44}
                size="compact-xs"
                color="red"
                variant="subtle"
                leftSection={<Trash2 size={14} />}
                onClick={() => setAudio(undefined)}
              >
                移除
              </Button>
            </Group>
          )}
          {initialNote?.audio && !audio && (
            <Text size="sm" c="dimmed">
              已保留原有录音；重新录音后会替换。
            </Text>
          )}
        </Stack>
      </Fieldset>
    </EditorSheet>
  );
}
