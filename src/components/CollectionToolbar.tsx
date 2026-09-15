import { Button, Group, Input, Select, TextInput } from '@mantine/core';
import { Search } from 'lucide-react';

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
        aria-label={searchLabel}
        leftSection={<Search size={18} strokeWidth={1.8} color="var(--mantine-color-green-8)" />}
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
        w={92}
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
  return (
    <Group gap="xs" wrap="wrap">
      {options.map((option) => (
        <Button
          key={option.value}
          size="compact-sm"
          radius="md"
          color={value === option.value ? 'green' : 'gray'}
          variant={value === option.value ? 'filled' : 'subtle'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </Group>
  );
}
