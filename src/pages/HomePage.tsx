import {
  AspectRatio,
  Box,
  Button,
  Center,
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
  BookHeart,
  CalendarClock,
  CheckSquare,
  Download,
  FileText,
  FileUp,
  Search,
  Utensils,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { recipeCover } from '../attachments';
import { AttachmentPreview } from '../components/AttachmentPreview';
import { daysFromDate, dueLabel, taskDueLabel } from '../dueDates';
import { usePageState } from '../hooks/usePageState';
import type { AddMode, AppTab, DocumentItem, NoteEntry, Recipe, TaskItem } from '../types';

interface Props {
  recipes: Recipe[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  notes: NoteEntry[];
  onNavigate: (tab: AppTab) => void;
  onAdd: (mode: AddMode) => void;
  onAddNote: () => void;
  onOpenRecipe: (item: Recipe) => void;
  onOpenDocument: (item: DocumentItem) => void;
  onOpenTask: (item: TaskItem) => void;
  onOpenNote: (item: NoteEntry) => void;
  backupOverdue: boolean;
  onBackup: () => void;
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
      w="100%"
      bd="none"
      bg="var(--app-surface)"
      shadow="xs"
      radius="lg"
      p="sm"
      ta="left"
      onClick={onClick}
    >
      <Group wrap="nowrap" gap="sm">
        <ThemeIcon variant="light" radius="xl" style={{ flexShrink: 0 }}>
          {icon}
        </ThemeIcon>
        <Stack gap={2} miw={0} flex={1}>
          <Text fw={650} size="sm" lineClamp={2}>
            {title}
          </Text>
          <Text c="dimmed" size="xs" lineClamp={1}>
            {detail}
          </Text>
        </Stack>
        <ArrowRight size={16} style={{ flexShrink: 0 }} aria-hidden />
      </Group>
    </Paper>
  );
}
export function HomePage({
  recipes,
  documents,
  tasks,
  notes,
  onNavigate,
  onAdd,
  onAddNote,
  onOpenRecipe,
  onOpenDocument,
  onOpenTask,
  onOpenNote,
  backupOverdue,
  onBackup,
}: Props) {
  const [query, setQuery] = usePageState('home:query', '');
  const [limit, setLimit] = usePageState('home:limit', 5);
  const keyword = query.trim().toLowerCase();
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
      return days !== undefined && days <= 30;
    })
    .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))
    .slice(0, 3);
  const results = useMemo(
    () => ({
      recipes: recipes.filter((item) =>
        [item.title, item.notes, item.category, ...item.ingredients, ...(item.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(keyword),
      ),
      documents: documents.filter((item) =>
        [item.title, item.description, item.ocrText, item.category, ...(item.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(keyword),
      ),
      tasks: tasks.filter((item) =>
        [item.title, item.notes, item.category, ...(item.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(keyword),
      ),
      notes: notes.filter((item) =>
        [item.title, item.content, item.mood].join(' ').toLowerCase().includes(keyword),
      ),
    }),
    [keyword, recipes, documents, tasks, notes],
  );
  const resultCount = Object.values(results).reduce((sum, items) => sum + items.length, 0);
  return (
    <Stack gap="md">
      <TextInput
        aria-label="搜索全部内容"
        placeholder="搜索菜谱、资料、待办和随记"
        leftSection={<Search size={18} />}
        size="md"
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setLimit(5);
        }}
        rightSection={
          query ? <Input.ClearButton aria-label="清除搜索" onClick={() => setQuery('')} /> : null
        }
      />
      {keyword ? (
        <Stack gap="md">
          <Text size="sm" c="dimmed" role="status">
            {resultCount
              ? '找到 ' + resultCount + ' 条相关记录'
              : '没有找到相关记录，试试其他关键词'}
          </Text>
          {!!results.recipes.length && (
            <Stack gap="xs">
              <Text fw={700} size="sm">
                菜谱 · {results.recipes.length}
              </Text>
              {results.recipes.slice(0, limit).map((item) => (
                <ResultButton
                  key={item.id}
                  icon={<Utensils size={18} />}
                  title={item.title}
                  detail={item.category}
                  onClick={() => onOpenRecipe(item)}
                />
              ))}
            </Stack>
          )}
          {!!results.documents.length && (
            <Stack gap="xs">
              <Text fw={700} size="sm">
                资料 · {results.documents.length}
              </Text>
              {results.documents.slice(0, limit).map((item) => (
                <ResultButton
                  key={item.id}
                  icon={<FileText size={18} />}
                  title={item.title}
                  detail={item.category}
                  onClick={() => onOpenDocument(item)}
                />
              ))}
            </Stack>
          )}
          {!!results.tasks.length && (
            <Stack gap="xs">
              <Text fw={700} size="sm">
                待办 · {results.tasks.length}
              </Text>
              {results.tasks.slice(0, limit).map((item) => (
                <ResultButton
                  key={item.id}
                  icon={<CheckSquare size={18} />}
                  title={item.title}
                  detail={(item.completed ? '已完成 · ' : '') + taskDueLabel(item.dueDate)}
                  onClick={() => onOpenTask(item)}
                />
              ))}
            </Stack>
          )}
          {!!results.notes.length && (
            <Stack gap="xs">
              <Text fw={700} size="sm">
                随记 · {results.notes.length}
              </Text>
              {results.notes.slice(0, limit).map((item) => (
                <ResultButton
                  key={item.id}
                  icon={<BookHeart size={18} />}
                  title={item.title}
                  detail={item.mood}
                  onClick={() => onOpenNote(item)}
                />
              ))}
            </Stack>
          )}
          {Object.values(results).some((items) => items.length > limit) && (
            <Button variant="light" onClick={() => setLimit((value) => value + 10)}>
              显示更多搜索结果
            </Button>
          )}
        </Stack>
      ) : (
        <>
          <Paper bg="var(--app-surface)" radius="lg" withBorder style={{ overflow: 'hidden' }}>
            <SimpleGrid cols={4} spacing={0}>
              {[
                { id: 'recipes', title: '菜谱', icon: Utensils, action: () => onAdd('recipes') },
                { id: 'documents', title: '资料', icon: FileUp, action: () => onAdd('documents') },
                { id: 'tasks', title: '待办', icon: CheckSquare, action: () => onAdd('tasks') },
                { id: 'notes', title: '随记', icon: BookHeart, action: onAddNote },
              ].map(({ id, title, icon: Icon, action }) => (
                <UnstyledButton key={id} onClick={action} aria-label={'新增' + title}>
                  <Stack align="center" gap={6} py="md">
                    <Icon size={21} strokeWidth={1.8} />
                    <Text fw={650} size="xs">
                      新建{title}
                    </Text>
                  </Stack>
                </UnstyledButton>
              ))}
            </SimpleGrid>
          </Paper>
          <Paper radius="lg" p="md" bg="blue.8" c="white">
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Stack gap={3} miw={0}>
                <Text fw={750} size="lg">
                  {pending.length ? pending.length + ' 件事待完成' : '暂时没有待办'}
                </Text>
                <Text size="xs" opacity={0.85}>
                  今天截止 {pending.filter((item) => daysFromDate(item.dueDate) === 0).length} 件 ·
                  已逾期 {pending.filter((item) => (daysFromDate(item.dueDate) ?? 0) < 0).length} 件
                </Text>
              </Stack>
              <Button
                variant="white"
                color="blue"
                px="sm"
                onClick={() => onNavigate('tasks')}
                rightSection={<ArrowRight size={16} />}
              >
                查看
              </Button>
            </Group>
          </Paper>
          {(dueTasks.length > 0 || expiringDocuments.length > 0) && (
            <Paper radius="lg" p="sm" bg="var(--mantine-color-orange-light)" withBorder>
              <Group gap="xs" mb="sm">
                <AlertTriangle size={18} />
                <Text fw={700} size="sm">
                  需要留意
                </Text>
              </Group>
              <Stack gap="xs">
                {dueTasks.map((item) => (
                  <ResultButton
                    key={item.id}
                    icon={<CheckSquare size={17} />}
                    title={item.title}
                    detail={taskDueLabel(item.dueDate)}
                    onClick={() => onOpenTask(item)}
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
          {backupOverdue && (
            <Paper radius="lg" p="sm" bg="var(--mantine-color-yellow-light)" withBorder>
              <Group wrap="nowrap" gap="xs">
                <Download size={18} style={{ flexShrink: 0 }} />
                <Stack gap={2} flex={1} miw={0}>
                  <Text fw={700} size="sm">
                    该备份生活手册了
                  </Text>
                  <Text c="dimmed" size="xs">
                    超过 30 天没有备份
                  </Text>
                </Stack>
                <Button color="yellow.8" px="xs" onClick={onBackup}>
                  备份
                </Button>
              </Group>
            </Paper>
          )}
          <Group justify="space-between">
            <Title order={3} size="h4">
              最近菜谱
            </Title>
            <Button
              variant="subtle"
              color="gray"
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
                  key={item.id}
                  component="button"
                  type="button"
                  p={0}
                  bd="none"
                  bg="var(--app-surface)"
                  radius="lg"
                  ta="left"
                  style={{ overflow: 'hidden' }}
                  onClick={() => onOpenRecipe(item)}
                >
                  <AspectRatio
                    ratio={16 / 9}
                    bg={index % 2 ? 'var(--app-cover-warm)' : 'var(--app-cover-blue)'}
                  >
                    {cover.available ? (
                      <AttachmentPreview id={cover.id} enabled alt={item.title} />
                    ) : (
                      <Center>
                        <Text c="var(--app-cover-mark)" fz={36}>
                          {item.title.slice(0, 1)}
                        </Text>
                      </Center>
                    )}
                  </AspectRatio>
                  <Box p="sm">
                    <Text fw={700} lineClamp={1}>
                      {item.title}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {item.category}
                    </Text>
                  </Box>
                </Paper>
              );
            })}
          </SimpleGrid>
          {!recipes.length && (
            <Button variant="light" onClick={() => onAdd('recipes')}>
              添加第一道菜
            </Button>
          )}
          <Group justify="space-between">
            <Title order={3} size="h4">
              最近资料
            </Title>
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              onClick={() => onNavigate('documents')}
            >
              打开资料库
            </Button>
          </Group>
          <Stack gap="xs">
            {documents.slice(0, 2).map((item) => (
              <ResultButton
                key={item.id}
                icon={<FileText size={18} />}
                title={item.title}
                detail={item.category}
                onClick={() => onOpenDocument(item)}
              />
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
