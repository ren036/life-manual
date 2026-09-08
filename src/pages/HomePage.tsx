import {
  Badge,
  Button,
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
      bg="white"
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
      <Paper radius="xl" p="lg" bg="green.8" c="white" mih={142}>
        <Text size="xs" opacity={0.8}>
          今天也慢慢来
        </Text>
        <Title order={2} size="h2" mt={6} mb="lg" lh={1.25}>
          {pending.length ? `还有 ${pending.length} 件事等你处理` : '今天的事情都完成了'}
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
        <Paper radius="xl" p="md" bg="yellow.0" withBorder>
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
        <Paper radius="xl" p="md" bg="orange.0" withBorder>
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
        leftSection={<Search size={17} />}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="搜索菜谱、资料或待办"
        size="lg"
        rightSection={
          query ? (
            <Input.ClearButton
              aria-label="Clear input"
              onClick={() => setQuery('')}
            />
          ) : null
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
          <SimpleGrid cols={3} spacing="sm">
            {[
              {
                mode: 'recipes' as const,
                icon: <Utensils />,
                title: '记一道菜',
                detail: '味道和照片',
              },
              {
                mode: 'documents' as const,
                icon: <FileUp />,
                title: '存份资料',
                detail: '图片或文件',
              },
              {
                mode: 'tasks' as const,
                icon: <CheckSquare />,
                title: '加个待办',
                detail: '别让事情溜走',
              },
            ].map((action) => (
              <Paper
                component="button"
                type="button"
                bd="none"
                bg="white"
                shadow="xs"
                radius="xl"
                px="xs"
                py="md"
                ta="center"
                mih={94}
                key={action.mode}
                onClick={() => onAdd(action.mode)}
              >
                <ThemeIcon variant="light" radius="xl" size={40} mb="xs">
                  {action.icon}
                </ThemeIcon>
                <Text fw={700} size="sm">
                  {action.title}
                </Text>
                <Text c="dimmed" size="xs">
                  {action.detail}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
          <Group justify="space-between">
            <Title order={3} size="h4">
              最近做过
            </Title>
            <Button variant="subtle" size="compact-sm" onClick={() => onNavigate('recipes')}>
              全部菜谱
            </Button>
          </Group>
          <SimpleGrid cols={2} spacing="sm">
            {recipes.slice(0, 2).map((item) => (
              <Paper
                component="button"
                type="button"
                bd="none"
                bg="white"
                shadow="xs"
                radius="xl"
                p="lg"
                mih={112}
                key={item.id}
                onClick={() => onOpenRecipe(item)}
              >
                <ThemeIcon variant="light" radius="xl" size={40} mb="xs">
                  <Utensils />
                </ThemeIcon>
                <Text fw={700} lineClamp={1}>
                  {item.title}
                </Text>
                <Text c="dimmed" size="xs" lineClamp={1}>
                  {item.ingredients.join(' · ') || item.category}
                </Text>
              </Paper>
            ))}
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
            <Button variant="subtle" size="compact-sm" onClick={() => onNavigate('documents')}>
              打开资料库
            </Button>
          </Group>
          <Stack gap="xs">
            {documents.slice(0, 2).map((item) => (
              <Paper
                component="button"
                type="button"
                bd="none"
                bg="white"
                shadow="xs"
                radius="xl"
                p="md"
                key={item.id}
                onClick={() => onOpenDocument(item)}
              >
                <Group>
                  <ThemeIcon variant="light" radius="xl">
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
