import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Center,
  CloseButton,
  Group,
  Input,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Camera,
  CheckSquare,
  FileText,
  FileUp,
  Download,
  Search,
  Utensils,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { AttachmentPreview } from '../components/AttachmentPreview';
import { daysFromDate, dueLabel } from '../dueDates';
import type { AddMode, AppTab, DocumentItem, Recipe, TaskItem } from '../types';
interface Props {
  recipes: Recipe[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  onNavigate: (tab: AppTab) => void;
  onAdd: (mode: AddMode) => void;
  onOpenRecipe: (item: Recipe) => void;
  onOpenDocument: (item: DocumentItem) => void;
  backupOverdue: boolean;
  onBackup: () => void;
}

function recipeCover(item: Recipe) {
  const latestPhoto = [...(item.cookingRecords || [])]
    .sort((a, b) => b.createdAt - a.createdAt)[0]
    ?.attachments.find((attachment) => attachment.type.startsWith('image/'));
  return {
    id: latestPhoto?.id || item.attachments?.[0]?.id || item.id,
    available: !!latestPhoto || !!item.hasFile,
  };
}
function ResultButton({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <Paper
      component="button"
      type="button"
      bd="none"
      bg="var(--app-surface)"
      shadow="xs"
      radius="xl"
      p="md"
      onClick={onClick}
    >
      <Group wrap="nowrap">
        <ThemeIcon variant="light" radius="xl">
          {icon}
        </ThemeIcon>
        <Stack gap={0}>
          <Text fw={650} size="sm" lineClamp={1}>
            {title}
          </Text>
          <Text c="dimmed" size="xs">
            {detail}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
export function HomePage({
  recipes,
  documents,
  tasks,
  onNavigate,
  onAdd,
  onOpenRecipe,
  onOpenDocument,
  backupOverdue,
  onBackup,
}: Props) {
  const [query, setQuery] = useState('');
  const pending = tasks.filter((item) => !item.completed);
  const dueTasks = pending
    .filter((item) => {
      const days = daysFromDate(item.dueDate);
      return days !== undefined && days <= 7;
    })
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 3);
  const expiringDocuments = documents
    .filter((item) => {
      const days = daysFromDate(item.expiryDate);
      return days !== undefined && days >= 0 && days <= 30;
    })
    .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))
    .slice(0, 3);
  const keyword = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      !keyword
        ? null
        : {
            recipes: recipes
              .filter((item) =>
                `${item.title} ${item.notes} ${item.ingredients.join(' ')} ${(item.tags || []).join(' ')}`
                  .toLowerCase()
                  .includes(keyword),
              )
              .slice(0, 3),
            documents: documents
              .filter((item) =>
                `${item.title} ${item.description} ${item.ocrText || ''} ${item.category} ${(item.tags || []).join(' ')}`
                  .toLowerCase()
                  .includes(keyword),
              )
              .slice(0, 3),
            tasks: tasks
              .filter((item) =>
                `${item.title} ${item.notes} ${item.category}`.toLowerCase().includes(keyword),
              )
              .slice(0, 3),
          },
    [documents, keyword, recipes, tasks],
  );
  return (
    <Stack gap="lg">
      <Paper radius={28} p="lg" bg="green.8" c="white" mih={142} shadow="md">
        <Text size="xs" opacity={0.8}>
          今日待办
        </Text>
        <Title order={2} size="h2" mt={6} mb="lg" lh={1.25}>
          {pending.length ? `${pending.length} 件事待完成` : '今天没有未完成事项'}
        </Title>
        <Button
          variant="white"
          color="green"
          rightSection={<ArrowRight size={17} />}
          onClick={() => onNavigate('tasks')}
        >
          查看待办
        </Button>
      </Paper>
      {backupOverdue && (
        <Paper radius="xl" p="md" bg="var(--mantine-color-yellow-light)" withBorder>
          <Group wrap="nowrap" justify="space-between">
            <Group wrap="nowrap">
              <ThemeIcon color="yellow" variant="light" radius="xl">
                <Download size={18} />
              </ThemeIcon>
              <Stack gap={1}>
                <Text fw={700} size="sm">
                  该备份生活手册了
                </Text>
                <Text c="dimmed" size="xs">
                  距离上次备份已经超过 30 天
                </Text>
              </Stack>
            </Group>
            <Button size="compact-sm" color="yellow.8" onClick={onBackup}>
              立即备份
            </Button>
          </Group>
        </Paper>
      )}
      {(dueTasks.length > 0 || expiringDocuments.length > 0) && (
        <Paper radius="xl" p="md" bg="var(--mantine-color-orange-light)" withBorder>
          <Group gap="xs" mb="sm">
            <AlertTriangle size={18} color="var(--mantine-color-orange-7)" />
            <Text fw={700} c="orange.9">
              需要留意
            </Text>
          </Group>
          <Stack gap="xs">
            {dueTasks.map((item) => (
              <ResultButton
                key={item.id}
                icon={<CheckSquare size={17} />}
                title={item.title}
                detail={dueLabel(item.dueDate).replace('到期', '截止')}
                onClick={() => onNavigate('tasks')}
              />
            ))}
            {expiringDocuments.map((item) => (
              <ResultButton
                key={item.id}
                icon={<CalendarClock size={17} />}
                title={item.title}
                detail={dueLabel(item.expiryDate)}
                onClick={() => onOpenDocument(item)}
              />
            ))}
          </Stack>
        </Paper>
      )}
      <TextInput
        aria-label="搜索全部内容"
        leftSection={<Search size={18} strokeWidth={1.8} color="var(--mantine-color-green-8)" />}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="搜索全部内容"
        size="lg"
        rightSection={
          query ? <Input.ClearButton aria-label="清除搜索" onClick={() => setQuery('')} /> : null
        }
      />
      {results ? (
        <Stack gap="xs">
          {results.recipes.map((item) => (
            <ResultButton
              key={item.id}
              icon={<Utensils size={17} />}
              title={item.title}
              detail={`菜谱 · ${item.category}`}
              onClick={() => onOpenRecipe(item)}
            />
          ))}
          {results.documents.map((item) => (
            <ResultButton
              key={item.id}
              icon={<FileText size={17} />}
              title={item.title}
              detail={`资料 · ${item.category}`}
              onClick={() => onOpenDocument(item)}
            />
          ))}
          {results.tasks.map((item) => (
            <ResultButton
              key={item.id}
              icon={<CheckSquare size={17} />}
              title={item.title}
              detail={`待办 · ${item.category}`}
              onClick={() => onNavigate('tasks')}
            />
          ))}
          {!results.recipes.length && !results.documents.length && !results.tasks.length && (
            <Text ta="center" c="dimmed" py="xl">
              没有找到相关记录
            </Text>
          )}
        </Stack>
      ) : (
        <>
          <Paper
            bg="var(--app-surface)"
            radius="lg"
            withBorder
            shadow="xs"
            style={{ overflow: 'hidden' }}
          >
            <SimpleGrid cols={3} spacing={0}>
              {[
                { mode: 'recipes' as const, icon: Utensils, title: '菜谱' },
                { mode: 'documents' as const, icon: FileUp, title: '资料' },
                { mode: 'tasks' as const, icon: CheckSquare, title: '待办' },
              ].map(({ mode, icon: Icon, title }, index) => (
                <UnstyledButton
                  key={mode}
                  onClick={() => onAdd(mode)}
                  aria-label={`新增${title}`}
                  style={{
                    borderRight: index < 2 ? '1px solid var(--mantine-color-gray-2)' : undefined,
                  }}
                >
                  <Stack align="center" gap={6} py="md">
                    <Icon size={21} strokeWidth={1.8} />
                    <Text fw={650} size="sm">
                      新建{title}
                    </Text>
                  </Stack>
                </UnstyledButton>
              ))}
            </SimpleGrid>
          </Paper>
          <Group justify="space-between">
            <Title order={3} size="h4">
              最近做过
            </Title>
            <Button
              color="gray"
              fw={600}
              variant="subtle"
              size="compact-sm"
              onClick={() => onNavigate('recipes')}
            >
              全部菜谱
            </Button>
          </Group>
          <SimpleGrid cols={2} spacing="sm">
            {recipes.slice(0, 2).map((item, index) => {
              const cover = recipeCover(item);
              return (
                <Paper
                  component="button"
                  type="button"
                  bd="none"
                  bg="var(--app-surface)"
                  shadow="xs"
                  radius="lg"
                  withBorder
                  p={0}
                  style={{ overflow: 'hidden' }}
                  key={item.id}
                  onClick={() => onOpenRecipe(item)}
                >
                  <AspectRatio
                    ratio={16 / 9}
                    bg={index % 2 ? 'var(--app-cover-warm)' : 'var(--app-cover-green)'}
                  >
                    {cover.available ? (
                      <AttachmentPreview id={cover.id} enabled alt={item.title} />
                    ) : (
                      <Center>
                        <Text
                          c="var(--app-cover-mark)"
                          ff="'Songti SC', STSong, SimSun, serif"
                          fz={42}
                          lh={1}
                        >
                          {item.title.slice(0, 1)}
                        </Text>
                      </Center>
                    )}
                  </AspectRatio>
                  <Box p="sm" ta="left">
                    <Text fw={700} lineClamp={1}>
                      {item.title}
                    </Text>
                    <Text c="dimmed" size="xs" lineClamp={1}>
                      {item.category} · {item.ingredients.slice(0, 2).join('、') || '暂无食材'}
                    </Text>
                  </Box>
                </Paper>
              );
            })}
            {!recipes.length && (
              <Button variant="light" onClick={() => onAdd('recipes')}>
                添加第一道菜
              </Button>
            )}
          </SimpleGrid>
          <Group justify="space-between">
            <Title order={3} size="h4">
              最近资料
            </Title>
            <Button
              color="gray"
              fw={600}
              variant="subtle"
              size="compact-sm"
              onClick={() => onNavigate('documents')}
            >
              打开资料库
            </Button>
          </Group>
          <Stack gap="xs">
            {documents.slice(0, 2).map((item) => (
              <Paper
                component="button"
                type="button"
                bd="none"
                bg="var(--app-surface)"
                shadow="xs"
                radius="lg"
                withBorder
                p="md"
                key={item.id}
                onClick={() => onOpenDocument(item)}
              >
                <Group>
                  <ThemeIcon variant="light" radius="md">
                    {item.isImage ? <Camera /> : <FileUp />}
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text fw={700}>{item.title}</Text>
                    <Badge variant="light" size="xs">
                      {item.category}
                    </Badge>
                  </Stack>
                </Group>
              </Paper>
            ))}
            {!documents.length && (
              <Button variant="light" onClick={() => onAdd('documents')}>
                上传第一份资料
              </Button>
            )}
          </Stack>
        </>
      )}
    </Stack>
  );
}
