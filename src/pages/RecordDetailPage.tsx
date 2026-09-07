import {
  Anchor,
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
import { FileText, Share2, Star } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { recordAttachments } from '../attachments';
import { getAttachmentUrl } from '../storage/database';
import type { Attachment, DocumentItem, Recipe } from '../types';
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
    <Paper component="section" radius="xl" p="lg" bg="white">
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
}: {
  item: Recipe | DocumentItem;
  onToggleFavorite?: (item: Recipe) => void;
}) {
  const isRecipe = 'ingredients' in item;
  const attachments = recordAttachments(item);
  const steps = item.steps || [];
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
            {description.split('\\n').map((line, index) => (
              <Text key={index}>{line || '\\u00a0'}</Text>
            ))}
          </Stack>
        </DetailSection>
      )}
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
      {!description && !steps.length && !attachments.length && (
        <Text ta="center" c="dimmed" py="xl">
          这条记录还没有更多说明。
        </Text>
      )}
    </Stack>
  );
}
