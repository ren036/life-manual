import {
  Anchor,
  ActionIcon,
  Badge,
  Button,
  Group,
  Image,
  Paper,
  Pill,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  BellPlus,
  Camera,
  Check,
  Circle,
  FileText,
  Pencil,
  Share2,
  Star,
  Trash2,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { recordAttachments } from '../attachments';
import { getAttachmentUrl } from '../storage/database';
import { dueLabel } from '../dueDates';
import type { Attachment, CookingRecord, DocumentItem, Recipe, TaskItem } from '../types';
function DetailAttachment({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;
    getAttachmentUrl(attachment.id)
      .then((value) => {
        if (disposed) {
          if (value) URL.revokeObjectURL(value);
          return;
        }
        objectUrl = value;
        setUrl(value);
        setFailed(!value);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id]);
  if (!url)
    return (
      <Text c="dimmed" size="sm">
        {attachment.name} · {failed ? '附件暂时无法读取' : '正在加载…'}
      </Text>
    );
  if (attachment.type.startsWith('image/'))
    return (
      <Anchor href={url} target="_blank" aria-label={`查看原图：${attachment.name}`}>
        <Image
          src={url}
          alt={attachment.name}
          radius="md"
          mah={520}
          fit="contain"
          onError={() => setFailed(true)}
        />
        {failed && (
          <Text c="dimmed" size="xs">
            图片无法预览，点击查看原文件
          </Text>
        )}
      </Anchor>
    );
  return (
    <Paper component="a" href={url} download={attachment.name} withBorder radius="md" p="md">
      <Group wrap="nowrap">
        <ThemeIcon variant="light" radius="xl">
          <FileText />
        </ThemeIcon>
        <Stack gap={0}>
          <Text fw={650}>{attachment.name}</Text>
          <Text c="dimmed" size="xs">
            下载文件
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
function DetailSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <Paper component="section" radius="xl" p="lg" bg="var(--app-surface)" shadow="xs">
      <Group justify="space-between" mb="md">
        <Title order={3}>{title}</Title>
        {aside && (
          <Text c="dimmed" size="xs">
            {aside}
          </Text>
        )}
      </Group>
      {children}
    </Paper>
  );
}
export function RecordDetailPage({
  item,
  onToggleFavorite,
  onAddCookingRecord,
  onEditCookingRecord,
  onDeleteCookingRecord,
  relatedTasks,
  onCreateRelatedTask,
}: {
  item: Recipe | DocumentItem;
  onToggleFavorite?: (item: Recipe) => void;
  onAddCookingRecord?: (item: Recipe) => void;
  onEditCookingRecord?: (item: Recipe, record: CookingRecord) => void;
  onDeleteCookingRecord?: (item: Recipe, record: CookingRecord) => void;
  relatedTasks: TaskItem[];
  onCreateRelatedTask: (item: Recipe | DocumentItem) => void;
}) {
  const isRecipe = 'ingredients' in item;
  const attachments = recordAttachments(item);
  const steps = item.steps || [];
  const cookingRecords = isRecipe
    ? [...(item.cookingRecords || [])].sort((a, b) => b.createdAt - a.createdAt)
    : [];
  const description = isRecipe ? item.notes : item.description;
  const [shareLabel, setShareLabel] = useState('分享');
  async function share() {
    const text = [
      item.title,
      item.category,
      isRecipe && item.ingredients.length ? `食材：${item.ingredients.join('、')}` : description,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      if (navigator.share) await navigator.share({ title: item.title, text });
      else {
        await navigator.clipboard.writeText(text);
        setShareLabel('已复制');
        window.setTimeout(() => setShareLabel('分享'), 1800);
      }
    } catch {
      /* 用户取消分享时保持安静 */
    }
  }
  return (
    <Stack gap="md">
      <Stack component="header" gap="sm" px="xs" py="md">
        <Group gap="xs">
          {' '}
          <Badge>{item.category}</Badge>
          {!isRecipe && item.important && <Badge color="yellow">重要资料</Badge>}
          {item.tags?.map((tag) => (
            <Badge color="yellow" variant="light" key={tag}>
              #{tag}
            </Badge>
          ))}
        </Group>
        <Title order={1}>{item.title}</Title>
        <Group justify="space-between">
          <Text c="dimmed" size="xs">
            {new Date(item.createdAt).toLocaleDateString('zh-CN')}
          </Text>
          <Group gap="xs">
            {isRecipe && (
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<Star size={15} fill={item.favorite ? 'currentColor' : 'none'} />}
                onClick={() => onToggleFavorite?.(item)}
              >
                {item.favorite ? '已收藏' : '收藏'}
              </Button>
            )}
            <Button
              variant="light"
              size="compact-sm"
              leftSection={<Share2 size={15} />}
              onClick={share}
            >
              {shareLabel}
            </Button>
          </Group>
        </Group>
      </Stack>
      {!!attachments.length && (
        <DetailSection
          title={isRecipe ? '成品照片' : '图片与附件'}
          aside={`${attachments.length} 个`}
        >
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {attachments.map((attachment) => (
              <DetailAttachment key={attachment.id} attachment={attachment} />
            ))}
          </SimpleGrid>
        </DetailSection>
      )}
      {isRecipe && (
        <DetailSection
          title="下厨记录"
          aside={cookingRecords.length ? `已做 ${cookingRecords.length} 次` : undefined}
        >
          <Stack gap="lg">
            <Button
              variant={cookingRecords.length ? 'light' : 'filled'}
              leftSection={<Camera size={18} />}
              onClick={() => onAddCookingRecord?.(item)}
            >
              记录这次下厨
            </Button>
            {cookingRecords.length ? (
              cookingRecords.map((record, index) => (
                <Stack key={record.id} gap="sm">
                  <Group justify="space-between">
                    <Text fw={700}>第 {cookingRecords.length - index} 次</Text>
                    <Group gap={3} wrap="nowrap">
                      <Text c="dimmed" size="sm">
                        {new Date(`${record.date}T00:00:00`).toLocaleDateString('zh-CN')}
                      </Text>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => onEditCookingRecord?.(item, record)}
                        aria-label={`编辑第 ${cookingRecords.length - index} 次下厨记录`}
                      >
                        <Pencil size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => onDeleteCookingRecord?.(item, record)}
                        aria-label={`删除第 ${cookingRecords.length - index} 次下厨记录`}
                      >
                        <Trash2 size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  {record.notes && <Text>{record.notes}</Text>}
                  <SimpleGrid cols={{ base: 2, sm: 3 }}>
                    {record.attachments.map((attachment) => (
                      <DetailAttachment key={attachment.id} attachment={attachment} />
                    ))}
                  </SimpleGrid>
                </Stack>
              ))
            ) : (
              <Text c="dimmed" ta="center">
                做完后拍张照片，慢慢看见自己的进步。
              </Text>
            )}
          </Stack>
        </DetailSection>
      )}
      {isRecipe && (
        <DetailSection title="食材">
          {item.ingredients.length ? (
            <Group gap="xs">
              {item.ingredients.map((ingredient, index) => (
                <Pill key={index}>{ingredient}</Pill>
              ))}
            </Group>
          ) : (
            <Text c="dimmed">还没有记录食材</Text>
          )}
        </DetailSection>
      )}
      {!isRecipe && item.expiryDate && (
        <DetailSection title="到期或保修日期">
          <Text>{new Date(`${item.expiryDate}T00:00:00`).toLocaleDateString('zh-CN')}</Text>
        </DetailSection>
      )}
      {description && (
        <DetailSection title={isRecipe ? '心得与备注' : '说明'}>
          <Stack gap={4}>
            {description.split('\n').map((line, index) => (
              <Text key={index}>{line || '\u00a0'}</Text>
            ))}
          </Stack>
        </DetailSection>
      )}
      {!isRecipe && item.ocrText && (
        <DetailSection title="识别文字" aside="可用于搜索">
          <Stack gap={4}>
            {item.ocrText.split('\n').map((line, index) => (
              <Text key={index}>{line || '\u00a0'}</Text>
            ))}
          </Stack>
        </DetailSection>
      )}
      <DetailSection
        title="相关待办"
        aside={relatedTasks.length ? `${relatedTasks.length} 项` : undefined}
      >
        <Stack gap="sm">
          <Button
            variant={relatedTasks.length ? 'light' : 'filled'}
            leftSection={<BellPlus size={18} />}
            onClick={() => onCreateRelatedTask(item)}
          >
            添加相关待办
          </Button>
          {relatedTasks.map((task) => (
            <Paper withBorder radius="md" p="sm" key={task.id}>
              <Group wrap="nowrap">
                <ThemeIcon
                  variant={task.completed ? 'filled' : 'light'}
                  color="green"
                  radius="xl"
                  size="sm"
                >
                  {task.completed ? <Check size={13} /> : <Circle size={13} />}
                </ThemeIcon>
                <Stack gap={0} flex={1}>
                  <Text fw={650} size="sm" td={task.completed ? 'line-through' : undefined}>
                    {task.title}
                  </Text>
                  <Text c="dimmed" size="xs">
                    {task.dueDate ? dueLabel(task.dueDate).replace('到期', '截止') : '没有截止日期'}
                  </Text>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      </DetailSection>
      {!!steps.length && (
        <DetailSection title={isRecipe ? '制作步骤' : '操作步骤'} aside={`${steps.length} 步`}>
          <Stack gap="xl">
            {steps.map((step, index) => (
              <Stack key={step.id} gap="sm">
                <Group gap="xs">
                  <ThemeIcon radius="xl">{index + 1}</ThemeIcon>
                  <Text fw={700}>步骤 {index + 1}</Text>
                </Group>
                {step.text && <Text>{step.text}</Text>}
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  {step.attachments.map((attachment) => (
                    <DetailAttachment key={attachment.id} attachment={attachment} />
                  ))}
                </SimpleGrid>
              </Stack>
            ))}
          </Stack>
        </DetailSection>
      )}
      {!description && !steps.length && !attachments.length && !cookingRecords.length && (
        <Text ta="center" c="dimmed" py="xl">
          这条记录还没有更多说明。
        </Text>
      )}
    </Stack>
  );
}
