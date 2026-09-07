import {
  Badge,
  Button,
  Group,
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
  Search,
  Utensils,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import type { AddMode, AppTab, DocumentItem, Recipe, TaskItem } from '../types';
function dateKey(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
interface Props {
  recipes: Recipe[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  onNavigate: (tab: AppTab) => void;
  onAdd: (mode: AddMode) => void;
  onOpenRecipe: (item: Recipe) => void;
  onOpenDocument: (item: DocumentItem) => void;
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
    <Paper component="button" type="button" withBorder radius="lg" p="sm" onClick={onClick}>
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
}: Props) {
  const [query, setQuery] = useState('');
  const pending = tasks.filter((item) => !item.completed);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueTasks = pending
    .filter((item) => item.dueDate && new Date(`${item.dueDate}T00:00:00`) <= today)
    .slice(0, 3);
  const expiringDocuments = documents
    .filter((item) => {
      if (!item.expiryDate) return false;
      return (new Date(`${item.expiryDate}T00:00:00`).getTime() - today.getTime()) / 86400000 <= 30;
    })
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
                `${item.title} ${item.description} ${item.category} ${(item.tags || []).join(' ')}`
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
      <Paper radius="xl" p="lg" bg="green.7" c="white">
        <Text size="xs" opacity={0.8}>
          今天也慢慢来
        </Text>
        <Title order={2} mt={4} mb="md">
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
                detail={item.dueDate === dateKey() ? '今天截止' : '待办已逾期'}
                onClick={() => onNavigate('tasks')}
              />
            ))}
            {expiringDocuments.map((item) => (
              <ResultButton
                key={item.id}
                icon={<CalendarClock size={17} />}
                title={item.title}
                detail={`${item.expiryDate} 到期`}
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
        radius="md"
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
                withBorder
                radius="lg"
                p="sm"
                ta="center"
                key={action.mode}
                onClick={() => onAdd(action.mode)}
              >
                <ThemeIcon variant="light" radius="xl" mb="xs">
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
            <Title order={3}>最近做过</Title>
            <Button variant="subtle" size="compact-sm" onClick={() => onNavigate('recipes')}>
              全部菜谱
            </Button>
          </Group>
          <SimpleGrid cols={2} spacing="sm">
            {recipes.slice(0, 2).map((item) => (
              <Paper
                component="button"
                type="button"
                withBorder
                radius="lg"
                p="md"
                key={item.id}
                onClick={() => onOpenRecipe(item)}
              >
                <ThemeIcon variant="light" radius="xl" mb="xs">
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
            {!recipes.length && <Text c="dimmed">还没有记录菜品</Text>}
          </SimpleGrid>
          <Group justify="space-between">
            <Title order={3}>最近资料</Title>
            <Button variant="subtle" size="compact-sm" onClick={() => onNavigate('documents')}>
              打开资料库
            </Button>
          </Group>
          <Stack gap="xs">
            {documents.slice(0, 2).map((item) => (
              <Paper
                component="button"
                type="button"
                withBorder
                radius="lg"
                p="sm"
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
            {!documents.length && <Text c="dimmed">还没有保存资料</Text>}
          </Stack>
        </>
      )}
    </Stack>
  );
}
