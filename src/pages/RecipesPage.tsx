import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Center,
  Drawer,
  Group,
  Input,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { Check, Clipboard, Search, ShoppingCart, Star, Utensils, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttachmentPreview } from '../components/AttachmentPreview';
import { buildShoppingList, shoppingAmountLabel, shoppingListText } from '../shoppingList';
import type { Recipe } from '../types';
type SortMode = '最近添加' | '名称排序';

function recipeCover(item: Recipe) {
  const latestPhoto = [...(item.cookingRecords || [])]
    .sort((a, b) => b.createdAt - a.createdAt)[0]
    ?.attachments.find((attachment) => attachment.type.startsWith('image/'));
  return {
    id: latestPhoto?.id || item.attachments?.[0]?.id || item.id,
    available: !!latestPhoto || !!item.hasFile,
  };
}

export function RecipesPage({
  recipes,
  onOpen,
  onAdd,
}: {
  recipes: Recipe[];
  onOpen: (item: Recipe) => void;
  onAdd: () => void;
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('最近添加');
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState('复制清单');
  const categories = [
    { value: 'all', label: '全部' },
    { value: 'special:favorite', label: '收藏' },
    { value: 'special:cooked', label: '做过' },
    { value: 'special:uncooked', label: '没做过' },
    ...[...new Set(recipes.map((item) => item.category))].map((category) => ({
      value: `category:${category}`,
      label: category,
    })),
    ...[...new Set(recipes.flatMap((item) => item.tags || []))].map((tag) => ({
      value: `tag:${tag}`,
      label: `#${tag}`,
    })),
  ];
  const shown = useMemo(
    () =>
      recipes
        .filter(
          (item) =>
            (filter === 'all' || filter.startsWith('special:')
              ? filter === 'all' ||
                (filter === 'special:favorite' && !!item.favorite) ||
                (filter === 'special:cooked' && !!item.cookingRecords?.length) ||
                (filter === 'special:uncooked' && !item.cookingRecords?.length)
              : filter.startsWith('tag:')
                ? item.tags?.includes(filter.slice(4))
                : item.category === filter.slice(9)) &&
            `${item.title} ${item.notes} ${item.ingredients.join(' ')} ${(item.tags || []).join(' ')}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === '名称排序' ? a.title.localeCompare(b.title, 'zh-CN') : b.createdAt - a.createdAt,
        ),
    [filter, query, recipes, sort],
  );
  const selectedRecipes = useMemo(
    () => recipes.filter((recipe) => selectedIds.includes(recipe.id)),
    [recipes, selectedIds],
  );
  const shoppingItems = useMemo(() => buildShoppingList(selectedRecipes), [selectedRecipes]);

  function toggleSelecting() {
    setSelecting((value) => !value);
    setSelectedIds([]);
  }

  function chooseRecipe(item: Recipe) {
    if (!selecting) {
      onOpen(item);
      return;
    }
    setSelectedIds((ids) =>
      ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id],
    );
  }

  async function copyShoppingList() {
    try {
      await navigator.clipboard.writeText(shoppingListText(selectedRecipes, shoppingItems));
      setCopyLabel('已复制');
      window.setTimeout(() => setCopyLabel('复制清单'), 1600);
    } catch {
      setCopyLabel('复制失败');
    }
  }

  return (
    <Stack gap="md">
      <Group wrap="nowrap" align="stretch" gap="sm">
        <TextInput
          flex={1}
          aria-label="搜索菜谱"
          leftSection={<Search size={18} strokeWidth={1.8} color="var(--mantine-color-green-8)" />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="搜索菜名、食材或标签"
          rightSection={
            query ? <Input.ClearButton aria-label="清除搜索" onClick={() => setQuery('')} /> : null
          }
        />
        <Select
          w={92}
          aria-label="菜谱排序"
          value={sort}
          onChange={(value) => setSort((value || '最近添加') as SortMode)}
          data={[
            { value: '最近添加', label: '最新' },
            { value: '名称排序', label: '名称' },
          ]}
          allowDeselect={false}
          radius="md"
        />
      </Group>
      <Group justify="space-between" align="center" gap="sm">
        <Text size="xs" c="dimmed">
          {selecting ? '点击菜谱进行多选' : '选几道菜，自动汇总要买的食材'}
        </Text>
        <Button
          size="compact-sm"
          variant={selecting ? 'light' : 'filled'}
          leftSection={selecting ? <X size={15} /> : <ShoppingCart size={15} />}
          onClick={toggleSelecting}
        >
          {selecting ? '取消选菜' : '选菜买菜'}
        </Button>
      </Group>
      <Group gap="xs" wrap="wrap">
        {categories.map((item) => (
          <Button
            key={item.value}
            size="compact-sm"
            radius="md"
            color={filter === item.value ? 'green' : 'gray'}
            variant={filter === item.value ? 'filled' : 'subtle'}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </Group>
      {shown.length ? (
        <SimpleGrid cols={2} spacing="sm">
          {shown.map((item, index) => {
            const cover = recipeCover(item);
            const selected = selectedIds.includes(item.id);
            return (
              <Paper
                component="button"
                type="button"
                bd="none"
                shadow="xs"
                radius="lg"
                withBorder
                p={0}
                bg="var(--app-surface)"
                ta="left"
                pos="relative"
                key={item.id}
                onClick={() => chooseRecipe(item)}
                aria-pressed={selecting ? selected : undefined}
                style={{
                  overflow: 'hidden',
                  outline: selected ? '2px solid var(--mantine-color-green-6)' : undefined,
                }}
              >
                <AspectRatio
                  ratio={4 / 3}
                  bg={index % 2 ? 'var(--app-cover-warm)' : 'var(--app-cover-green)'}
                >
                  <Box w="100%" h="100%">
                    {cover.available ? (
                      <AttachmentPreview id={cover.id} enabled alt={item.title} />
                    ) : (
                      <Center w="100%" h="100%">
                        <Text
                          c="var(--app-cover-mark)"
                          ff="'Songti SC', STSong, SimSun, serif"
                          fz={40}
                          lh={1}
                        >
                          {item.title.slice(0, 1)}
                        </Text>
                      </Center>
                    )}
                  </Box>
                </AspectRatio>
                {item.favorite && (
                  <ThemeIcon
                    pos="absolute"
                    top={8}
                    right={8}
                    radius="lg"
                    color="orange"
                    variant="filled"
                    aria-label="已收藏"
                  >
                    <Star size={16} fill="currentColor" />
                  </ThemeIcon>
                )}
                {selecting && (
                  <ThemeIcon
                    pos="absolute"
                    top={8}
                    left={8}
                    radius="xl"
                    color={selected ? 'green' : 'gray'}
                    variant={selected ? 'filled' : 'light'}
                    aria-hidden
                  >
                    {selected ? <Check size={16} /> : <ShoppingCart size={15} />}
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
            );
          })}
        </SimpleGrid>
      ) : (
        <Paper bg="var(--app-surface)" radius="lg" p="xl" ta="center" withBorder>
          <Stack align="center" gap="sm">
            <Text c="dimmed">{recipes.length ? '还没有符合条件的菜。' : '还没有记录菜谱。'}</Text>
            {!recipes.length && <Button onClick={onAdd}>添加第一道菜</Button>}
          </Stack>
        </Paper>
      )}
      {selecting && (
        <Paper
          withBorder
          shadow="md"
          radius="xl"
          p="sm"
          pos="sticky"
          bottom={76}
          style={{ zIndex: 10 }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={600}>
              已选 {selectedIds.length} 道菜
            </Text>
            <Button
              leftSection={<ShoppingCart size={16} />}
              disabled={!selectedIds.length}
              onClick={() => {
                setCopyLabel('复制清单');
                setShoppingOpen(true);
              }}
            >
              生成采购清单
            </Button>
          </Group>
        </Paper>
      )}
      <Drawer
        opened={shoppingOpen}
        onClose={() => setShoppingOpen(false)}
        position="bottom"
        size="min(82vh, 680px)"
        radius="xl"
        title="采购清单"
        overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            来自 {selectedRecipes.map((recipe) => recipe.title).join('、')}
          </Text>
          {shoppingItems.length ? (
            <Stack gap="xs">
              {shoppingItems.map((item) => (
                <Paper key={item.name} withBorder radius="lg" p="sm">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2}>
                      <Text fw={700}>{item.name}</Text>
                      <Text size="xs" c="dimmed">
                        用于：{item.recipes.join('、')}
                      </Text>
                    </Stack>
                    <Text size="sm" ta="right">
                      {shoppingAmountLabel(item)}
                    </Text>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Paper bg="var(--app-surface)" radius="lg" p="lg" ta="center">
              <Text c="dimmed">所选菜谱还没有填写食材。</Text>
            </Paper>
          )}
          <Button
            fullWidth
            size="md"
            variant="light"
            leftSection={<Clipboard size={17} />}
            disabled={!shoppingItems.length}
            onClick={() => void copyShoppingList()}
          >
            {copyLabel}
          </Button>
        </Stack>
      </Drawer>
    </Stack>
  );
}
