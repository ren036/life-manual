import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { Search, Star, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttachmentPreview } from '../components/AttachmentPreview';
import type { Recipe } from '../types';
type SortMode = '最近添加' | '名称排序';
export function RecipesPage({
  recipes,
  onOpen,
}: {
  recipes: Recipe[];
  onOpen: (item: Recipe) => void;
}) {
  const [filter, setFilter] = useState('全部');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('最近添加');
  const categories = [
    '全部',
    '收藏',
    ...new Set(recipes.map((item) => item.category)),
    ...new Set(recipes.flatMap((item) => item.tags || []).map((tag) => `#${tag}`)),
  ];
  const shown = useMemo(
    () =>
      recipes
        .filter(
          (item) =>
            (filter === '全部' || filter === '收藏'
              ? filter === '全部' || !!item.favorite
              : filter.startsWith('#')
                ? item.tags?.includes(filter.slice(1))
                : item.category === filter) &&
            `${item.title} ${item.notes} ${item.ingredients.join(' ')} ${(item.tags || []).join(' ')}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === '名称排序' ? a.title.localeCompare(b.title, 'zh-CN') : b.createdAt - a.createdAt,
        ),
    [filter, query, recipes, sort],
  );
  return (
    <Stack gap="md">
      <Group wrap="nowrap" align="stretch">
        <TextInput
          flex={1}
          leftSection={<Search size={17} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="搜菜名、食材或标签"
          radius="md"
        />
        <Select
          w={110}
          aria-label="菜谱排序"
          value={sort}
          onChange={(value) => setSort((value || '最近添加') as SortMode)}
          data={['最近添加', '名称排序']}
          allowDeselect={false}
          radius="md"
        />
      </Group>
      <Group gap="xs" wrap="wrap">
        {categories.map((item) => (
          <Button
            key={item}
            size="compact-sm"
            radius="xl"
            variant={filter === item ? 'filled' : 'light'}
            onClick={() => setFilter(item)}
          >
            {item}
          </Button>
        ))}
      </Group>
      {shown.length ? (
        <SimpleGrid cols={2} spacing="sm">
          {shown.map((item) => (
            <Paper
              component="button"
              type="button"
              withBorder
              radius="lg"
              p={0}
              bg="white"
              ta="left"
              pos="relative"
              key={item.id}
              onClick={() => onOpen(item)}
            >
              <AspectRatio ratio={4 / 3} bg="green.0">
                <Box w="100%" h="100%">
                  {item.hasFile ? (
                    <AttachmentPreview
                      id={item.attachments?.[0]?.id || item.id}
                      enabled
                      alt={item.title}
                    />
                  ) : (
                    <Center w="100%" h="100%">
                      <ThemeIcon size="xl" radius="xl" variant="light">
                        <Utensils />
                      </ThemeIcon>
                    </Center>
                  )}
                </Box>
              </AspectRatio>
              {item.favorite && (
                <ThemeIcon
                  pos="absolute"
                  top={8}
                  right={8}
                  radius="xl"
                  color="orange"
                  variant="filled"
                  aria-label="已收藏"
                >
                  <Star size={16} fill="currentColor" />
                </ThemeIcon>
              )}
              <Stack gap={4} p="sm">
                <Badge variant="light" size="xs">
                  {item.category}
                </Badge>
                <Text fw={700} lineClamp={1}>
                  {item.title}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {item.tags?.length
                    ? item.tags.map((tag) => `#${tag}`).join(' ')
                    : item.ingredients.length
                      ? item.ingredients.join(' · ')
                      : '还没有记录食材'}
                </Text>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      ) : (
        <Text ta="center" c="dimmed" py="xl">
          还没有符合条件的菜。
        </Text>
      )}
    </Stack>
  );
}
