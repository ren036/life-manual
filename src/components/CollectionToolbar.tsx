import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  Input,
  Radio,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  sort: string;
  onSortChange: (value: string) => void;
  sortLabel: string;
  sortOptions: Option[];
}

export function CollectionToolbar({
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  sort,
  onSortChange,
  sortLabel,
  sortOptions,
}: Props) {
  return (
    <Group wrap="nowrap" align="stretch" gap="sm">
      <TextInput
        flex={1}
        miw={0}
        aria-label={searchLabel}
        leftSection={<Search size={18} strokeWidth={1.8} color="var(--mantine-color-blue-8)" />}
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        placeholder={searchPlaceholder}
        rightSection={
          query ? (
            <Input.ClearButton aria-label="清除搜索" onClick={() => onQueryChange('')} />
          ) : null
        }
      />
      <Select
        w={80}
        style={{ flexShrink: 0 }}
        aria-label={sortLabel}
        value={sort}
        onChange={(value) => onSortChange(value || sortOptions[0].value)}
        data={sortOptions}
        allowDeselect={false}
        radius="md"
      />
    </Group>
  );
}

export function FilterChips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');
  const current = options.find((option) => option.value === value);
  const base = options.filter(
    (option) => !option.value.startsWith('category:') && !option.value.startsWith('tag:'),
  );
  const quick =
    current && !base.some((option) => option.value === current.value) ? [...base, current] : base;
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <Group gap={6} wrap="nowrap" miw={0}>
        <div className="filter-chips" role="group" aria-label="快速筛选">
          {quick.map((option) => (
            <Button
              key={option.value}
              size="compact-sm"
              mih={44}
              radius="md"
              style={{ flexShrink: 0 }}
              aria-pressed={value === option.value}
              color={value === option.value ? 'blue' : 'gray'}
              variant={value === option.value ? 'filled' : 'subtle'}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {options.length > base.length && (
          <ActionIcon
            size={44}
            variant="light"
            aria-label="展开全部筛选"
            style={{ flexShrink: 0 }}
            onClick={() => {
              setQuery('');
              setOpened(true);
            }}
          >
            <SlidersHorizontal size={19} />
          </ActionIcon>
        )}
      </Group>
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title="全部筛选"
        position="bottom"
        size="min(78dvh, 620px)"
        radius="xl"
      >
        <Stack gap="sm" pb="calc(16px + env(safe-area-inset-bottom))">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="查找分类或标签"
            aria-label="查找筛选条件"
            leftSection={<Search size={18} />}
          />
          <ScrollArea.Autosize mah="calc(78dvh - 170px)" type="auto">
            <Radio.Group
              value={value}
              onChange={(next) => {
                onChange(next);
                setOpened(false);
              }}
            >
              <Stack gap={4}>
                {filtered.map((option) => (
                  <Radio
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    styles={{
                      root: { minHeight: 48, padding: '8px' },
                      body: { alignItems: 'center' },
                      label: {
                        minHeight: 32,
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                      },
                    }}
                  />
                ))}
              </Stack>
            </Radio.Group>
            {!filtered.length && (
              <Text c="dimmed" ta="center" py="lg">
                没有匹配的分类或标签
              </Text>
            )}
          </ScrollArea.Autosize>
        </Stack>
      </Drawer>
    </>
  );
}
