import {
  Button,
  Drawer,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { Mic, MicOff, Save, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Mood, NoteEntry, PendingAttachment } from '../types';

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

const moodData = ['😊 开心', '😌 平静', '😔 低落', '😟 焦虑', '😤 生气'];
const moodFromLabel = (value: string) => value.slice(3) as Mood;

export function NoteSheet({
  open,
  initialNote,
  onClose,
  onSave,
}: {
  open: boolean;
  initialNote?: NoteEntry;
  onClose: () => void;
  onSave: (note: NoteEntry, audio?: PendingAttachment) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<Mood>('平静');
  const [audio, setAudio] = useState<PendingAttachment>();
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const recognitionRef = useRef<SpeechRecognitionLike | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(initialNote?.title || '');
    setContent(initialNote?.content || '');
    setMood(initialNote?.mood || '平静');
    setAudio(undefined);
    setError('');
  }, [open, initialNote]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    if (open) return;
    recognitionRef.current?.stop();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    setRecording(false);
    setDictating(false);
  }, [open]);

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
      setError('当前浏览器不支持录音，请换用最新版 Chrome、Edge 或 Safari。');
      return;
    }
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
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setError('');
    } catch {
      setError('没有获得麦克风权限，请在浏览器设置中允许后重试。');
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

  async function save() {
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
    setSaving(true);
    try {
      await onSave(note, audio);
    } catch {
      setError('保存失败，请重试。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      opened={open}
      onClose={onClose}
      title={initialNote ? '编辑随记' : '记录此刻'}
      position="bottom"
      size="min(92vh, 760px)"
      radius="xl"
      overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
    >
      <Stack gap="md">
        <SegmentedControl
          fullWidth
          size="xs"
          color="grape"
          value={`${moodData.find((item) => item.endsWith(mood))}`}
          onChange={(value) => setMood(moodFromLabel(value))}
          data={moodData}
        />
        <TextInput
          label="标题（选填）"
          placeholder="不填会自动取正文第一句"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
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
            color={dictating ? 'red' : 'grape'}
            variant={dictating ? 'filled' : 'light'}
            leftSection={dictating ? <MicOff size={18} /> : <Sparkles size={18} />}
            onClick={toggleDictation}
          >
            {dictating ? '停止转写' : '语音转文字'}
          </Button>
          <Button
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
        {audio && (
          <Group justify="space-between" p="sm" bg="blue.0" style={{ borderRadius: 12 }}>
            <Text size="sm">已录好一段语音</Text>
            <Button
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
        {error && (
          <Text role="alert" c="red" size="sm">
            {error}
          </Text>
        )}
        <Button
          color="grape"
          size="md"
          loading={saving}
          disabled={recording}
          leftSection={<Save size={18} />}
          onClick={() => void save()}
        >
          保存随记
        </Button>
      </Stack>
    </Drawer>
  );
}
