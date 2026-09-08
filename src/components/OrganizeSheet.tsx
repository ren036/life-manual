import {
  Button,
  Drawer,
  Group,
  MultiSelect,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { categoryOptions, parseTags } from '../categories';
import type { AddMode, AppData } from '../types';

const modeLabels: Record<AddMode, string> = {
  recipes: '菜谱',
  documents: '资料',
  tasks: '待办',
};

export function OrganizeSheet({
  open,
  data,
  onClose,
  onApply,
}: {
  open: boolean;
  data: AppData;
  onClose: () => void;
  onApply: (mode: AddMode, ids: string[], category?: string, tags?: string[]) => Promise<void>;
}) {
  const [mode, setMode] = useState<AddMode>('recipes');
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const records = data[mode];
  const itemOptions = records.map((item) => ({ value: item.id, label: item.title }));
  const categories = useMemo(
    () => [...new Set([...categoryOptions(mode), ...records.map((item) => item.category)])],
    [mode, records],
  );

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setCategory(null);
    setTags('');
    setError('');
  }, [open]);

  function changeMode(value: string) {
    setMode(value as AddMode);
    setSelected([]);
    setCategory(null);
    setTags('');
    setError('');
  }

  async function apply() {
    const parsedTags = parseTags(tags);
    if (!selected.length || (!category && !parsedTags.length)) return;
    setSaving(true);
    setError('');
    try {
      await onApply(mode, selected, category || undefined, parsedTags);
      setSelected([]);
      setCategory(null);
      setTags('');
    } catch {
      setError('批量整理失败，请检查设备存储空间后重试。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      opened={open}
      onClose={onClose}
      title="批量整理"
      position="bottom"
      size="min(88vh, 680px)"
      radius="xl"
      overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
    >
      <Stack gap="md">
        <Text c="dimmed" size="sm">
          一次修改多条内容的分类，并可追加标签；未填写的项目不会改变。
        </Text>
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={changeMode}
          data={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))}
        />
        <Paper withBorder radius="lg" p="md">
          <Stack gap="md">
            <MultiSelect
              label={`选择${modeLabels[mode]}`}
              placeholder={records.length ? '可搜索并多选' : `还没有${modeLabels[mode]}`}
              value={selected}
              onChange={setSelected}
              data={itemOptions}
              searchable
              clearable
              disabled={!records.length}
            />
            {!!records.length && (
              <Group gap="xs">
                <Button
                  type="button"
                  variant="subtle"
                  size="compact-xs"
                  onClick={() => setSelected(records.map((item) => item.id))}
                >
                  全选
                </Button>
                {!!selected.length && (
                  <Text c="dimmed" size="xs">
                    已选择 {selected.length} 项
                  </Text>
                )}
              </Group>
            )}
            <Select
              label="统一分类（可选）"
              placeholder="保持原分类"
              value={category}
              onChange={setCategory}
              data={categories}
              searchable
              clearable
            />
            <TextInput
              label="追加标签（可选）"
              placeholder="例如：家庭、常用"
              value={tags}
              onChange={(event) => setTags(event.currentTarget.value)}
            />
          </Stack>
        </Paper>
        {error && (
          <Text c="red" size="sm" role="alert">
            {error}
          </Text>
        )}
        <Button
          fullWidth
          size="md"
          loading={saving}
          disabled={!selected.length || (!category && !parseTags(tags).length)}
          onClick={() => void apply()}
        >
          整理 {selected.length || ''} 项内容
        </Button>
      </Stack>
    </Drawer>
  );
}
