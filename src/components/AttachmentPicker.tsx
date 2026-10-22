import {
  ActionIcon,
  AspectRatio,
  Button,
  Center,
  FileButton,
  Group,
  Image,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { Camera, Crop, FilePlus2, FileText, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { optimizeAttachments } from '../imageCompression';
import { getAttachmentFiles } from '../storage/database';
import { AttachmentPreview } from './AttachmentPreview';
import { ImageCropDialog } from './ImageCropDialog';
import type { DraftAttachment } from '../types';
function LocalPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return <Image src={url || undefined} alt={file.name} w="100%" h="100%" fit="cover" />;
}
export function AttachmentPicker({
  files,
  onChange,
  label,
  imagesOnly = false,
  destinations,
  onMove,
  onReturn,
  enableCamera = false,
  onBusyChange,
}: {
  files: DraftAttachment[];
  onChange: (files: DraftAttachment[]) => void;
  label: string;
  imagesOnly?: boolean;
  destinations?: { id: string; label: string }[];
  onMove?: (attachmentId: string, stepId?: string) => void;
  onReturn?: (attachmentId: string) => void;
  enableCamera?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [error, setError] = useState('');
  const [movingId, setMovingId] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [cropping, setCropping] = useState<{
    selected: File[];
    index: number;
    attachmentId?: string;
  }>();
  const filesRef = useRef(files);
  filesRef.current = files;
  const activeRef = useRef(true);
  const processingRef = useRef(false);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);
  const busy = processing || !!cropping;
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  useEffect(() => {
    busyCallback.current?.(busy);
    return () => busyCallback.current?.(false);
  }, [busy]);

  async function append(selected: File[]) {
    processingRef.current = true;
    setProcessing(true);
    try {
      const optimized = await optimizeAttachments(selected);
      if (!activeRef.current) return;
      onChange([
        ...filesRef.current,
        ...optimized.map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          file,
        })),
      ]);
    } catch {
      if (activeRef.current) setError('附件添加失败，请重新选择。');
    } finally {
      processingRef.current = false;
      if (activeRef.current) setProcessing(false);
    }
  }

  async function pick(selected: File[]) {
    if (processingRef.current || cropping || !selected.length) return;
    const accepted = selected.filter((file) => !imagesOnly || file.type.startsWith('image/'));
    setError(accepted.length !== selected.length ? '这里只能添加图片，请重新选择。' : '');
    if (!accepted.length) return;
    await append(accepted);
  }

  async function edit(attachment: DraftAttachment) {
    if (processingRef.current || cropping) return;
    processingRef.current = true;
    setProcessing(true);
    setError('');
    try {
      const file = attachment.file || (await getAttachmentFiles([attachment]))[0]?.file;
      if (!activeRef.current) return;
      if (!file) throw new Error('missing image');
      setCropping({ selected: [file], index: 0, attachmentId: attachment.id });
    } catch {
      if (activeRef.current) setError('无法读取这张照片，请重新添加后裁剪。');
    } finally {
      processingRef.current = false;
      if (activeRef.current) setProcessing(false);
    }
  }

  async function finishCrop(file?: File) {
    if (!cropping) return;
    if (cropping.attachmentId) {
      if (file) {
        const [optimized] = await optimizeAttachments([file]);
        if (!activeRef.current) return;
        // A new ID keeps the saved attachment intact until the record is saved.
        onChange(
          filesRef.current.map((item) =>
            item.id === cropping.attachmentId
              ? {
                  id: crypto.randomUUID(),
                  name: optimized.name,
                  type: optimized.type,
                  file: optimized,
                }
              : item,
          ),
        );
      }
    }
    if (activeRef.current) setCropping(undefined);
  }
  return (
    <Stack gap="xs">
      <Group grow>
        <FileButton
          multiple
          accept={imagesOnly ? 'image/*' : 'image/*,.pdf,.doc,.docx,.xls,.xlsx'}
          onChange={(selected) => void pick(selected)}
        >
          {(props) => (
            <Button
              {...props}
              type="button"
              mih={44}
              disabled={busy}
              loading={processing}
              variant="light"
              leftSection={<FilePlus2 size={18} />}
              fullWidth
            >
              {label}
            </Button>
          )}
        </FileButton>
        {enableCamera && (
          <FileButton
            accept="image/*"
            capture="environment"
            onChange={(selected) => selected && void pick([selected])}
          >
            {(props) => (
              <Button
                {...props}
                type="button"
                mih={44}
                disabled={busy}
                variant="light"
                leftSection={<Camera size={18} />}
              >
                {imagesOnly ? '拍照' : '拍照扫描'}
              </Button>
            )}
          </FileButton>
        )}
      </Group>
      <Text c="dimmed" size="xs">
        支持多选，添加后可按需裁剪。照片只保存在本机。
      </Text>
      {!!files.length && (
        <SimpleGrid cols={3} spacing="xs">
          {files.map((attachment, index) => (
            <Paper withBorder radius="md" p="xs" pos="relative" key={attachment.id}>
              <Stack gap={5}>
                <AspectRatio ratio={1} bg="var(--mantine-color-default-hover)">
                  {attachment.type.startsWith('image/') ? (
                    attachment.file ? (
                      <LocalPreview file={attachment.file} />
                    ) : (
                      <AttachmentPreview id={attachment.id} enabled alt={attachment.name} />
                    )
                  ) : (
                    <Center>
                      <FileText color="var(--mantine-color-blue-7)" />
                    </Center>
                  )}
                </AspectRatio>
                <Text size="xs" truncate title={attachment.name}>
                  {attachment.name}
                </Text>
                {attachment.type.startsWith('image/') && (
                  <Button
                    type="button"
                    variant="light"
                    size="compact-xs"
                    mih={44}
                    leftSection={<Crop size={13} />}
                    disabled={busy}
                    aria-label={`裁剪照片 ${index + 1}：${attachment.name}`}
                    onClick={() => void edit(attachment)}
                  >
                    裁剪
                  </Button>
                )}
                {onMove && (
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-xs"
                    mih={44}
                    disabled={busy}
                    onClick={() =>
                      setMovingId(movingId === attachment.id ? undefined : attachment.id)
                    }
                  >
                    用于步骤
                  </Button>
                )}
                {onMove && movingId === attachment.id && (
                  <Select
                    disabled={busy}
                    size="xs"
                    placeholder="选择步骤"
                    data={[
                      { value: '__new__', label: '新建步骤' },
                      ...(destinations || []).map((item) => ({
                        value: item.id,
                        label: item.label,
                      })),
                    ]}
                    onChange={(value) => {
                      if (!value) return;
                      onMove(attachment.id, value === '__new__' ? undefined : value);
                      setMovingId(undefined);
                    }}
                  />
                )}
                {onReturn && (
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-xs"
                    disabled={busy}
                    onClick={() => onReturn(attachment.id)}
                  >
                    移回顶部
                  </Button>
                )}
                <ActionIcon
                  type="button"
                  pos="absolute"
                  top={5}
                  right={5}
                  variant="filled"
                  color="gray"
                  size={36}
                  radius="xl"
                  aria-label={`移除图片或文件 ${index + 1}：${attachment.name}`}
                  disabled={busy}
                  onClick={() => onChange(files.filter((item) => item.id !== attachment.id))}
                >
                  <X size={15} />
                </ActionIcon>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}
      {error && (
        <Text c="red" size="sm" role="alert">
          {error}
        </Text>
      )}
      {cropping && (
        <ImageCropDialog
          key={`${cropping.attachmentId || 'new'}-${cropping.index}`}
          file={cropping.selected[cropping.index]}
          progress={
            cropping.attachmentId
              ? undefined
              : `${cropping.selected.slice(0, cropping.index + 1).filter((file) => file.type.startsWith('image/')).length} / ${cropping.selected.filter((file) => file.type.startsWith('image/')).length}`
          }
          onApply={finishCrop}
          onOriginal={() => finishCrop()}
          onClose={() => setCropping(undefined)}
        />
      )}
    </Stack>
  );
}
