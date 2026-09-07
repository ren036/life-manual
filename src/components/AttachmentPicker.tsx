import {
  ActionIcon,
  AspectRatio,
  Button,
  Center,
  FileButton,
  Image,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { FilePlus2, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { optimizeAttachments } from '../imageCompression';
import { AttachmentPreview } from './AttachmentPreview';
import type { DraftAttachment } from '../types';
function LocalPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return <Image src={url} alt={file.name} w="100%" h="100%" fit="cover" />;
}
export function AttachmentPicker({
  files,
  onChange,
  label,
  imagesOnly = false,
  destinations,
  onMove,
  onReturn,
}: {
  files: DraftAttachment[];
  onChange: (files: DraftAttachment[]) => void;
  label: string;
  imagesOnly?: boolean;
  destinations?: { id: string; label: string }[];
  onMove?: (attachmentId: string, stepId?: string) => void;
  onReturn?: (attachmentId: string) => void;
}) {
  const [error, setError] = useState('');
  const [movingId, setMovingId] = useState<string>();
  async function pick(selected: File[]) {
    const accepted = selected.filter((file) => !imagesOnly || file.type.startsWith('image/'));
    setError(accepted.length !== selected.length ? '这里只能添加图片，请重新选择。' : '');
    const optimized = await optimizeAttachments(accepted);
    onChange([
      ...files,
      ...optimized.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        file,
      })),
    ]);
  }
  return (
    <Stack gap="xs">
      <FileButton
        multiple
        accept={imagesOnly ? 'image/*' : 'image/*,.pdf,.doc,.docx,.xls,.xlsx'}
        onChange={(selected) => void pick(selected)}
      >
        {(props) => (
          <Button {...props} variant="light" leftSection={<FilePlus2 size={18} />} fullWidth>
            {label}
          </Button>
        )}
      </FileButton>
      <Text c="dimmed" size="xs">
        大图片会在设备上自动压缩后保存，原图不会上传。
      </Text>
      {!!files.length && (
        <SimpleGrid cols={3} spacing="xs">
          {files.map((attachment, index) => (
            <Paper withBorder radius="md" p="xs" pos="relative" key={attachment.id}>
              <Stack gap={5}>
                <AspectRatio ratio={1} bg="gray.0">
                  {attachment.type.startsWith('image/') ? (
                    attachment.file ? (
                      <LocalPreview file={attachment.file} />
                    ) : (
                      <AttachmentPreview id={attachment.id} enabled alt={attachment.name} />
                    )
                  ) : (
                    <Center>
                      <FileText color="var(--mantine-color-green-7)" />
                    </Center>
                  )}
                </AspectRatio>
                <Text size="xs" truncate title={attachment.name}>
                  {attachment.name}
                </Text>
                {onMove && (
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-xs"
                    onClick={() =>
                      setMovingId(movingId === attachment.id ? undefined : attachment.id)
                    }
                  >
                    用于步骤
                  </Button>
                )}
                {onMove && movingId === attachment.id && (
                  <Select
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
                  size="sm"
                  radius="xl"
                  aria-label={`移除图片或文件 ${index + 1}：${attachment.name}`}
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
    </Stack>
  );
}
