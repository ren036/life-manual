import { ActionIcon, Button, Drawer, Menu, TextInput } from '@mantine/core';
import {
  ArrowDownUp,
  Check,
  FileText,
  Library,
  ListFilter,
  NotebookPen,
  Plus,
  Search,
  Utensils,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeading } from '../components/PageHeading';
import { RecordRow } from '../components/RecordRow';
import { usePageState } from '../hooks/usePageState';
import { libraryRecords, recordText, type LibraryRecord, type RecordKind } from '../library';
import { daysFromDate } from '../dueDates';
import { RecipesPage } from './RecipesPage';
import type { AppData } from '../types';
type Kind = 'all' | RecordKind;
const kinds = [
  { value: 'all', label: '全部' },
  { value: 'document', label: '资料' },
  { value: 'note', label: '随记' },
  { value: 'recipe', label: '菜谱' },
] as const;
interface Props {
  data: Pick<AppData, 'recipes' | 'documents' | 'notes'>;
  onOpen: (record: LibraryRecord) => void;
  onAdd: (kind: Kind) => void;
}
export function RecordsPage({ data, onOpen, onAdd }: Props) {
  const [params, setParams] = useSearchParams();
  const [rememberedKind, setRememberedKind] = usePageState<Kind>('library:kind', 'all');
  const requested = params.get('type');
  const kind: Kind = kinds.some((item) => item.value === requested)
    ? (requested as Kind)
    : params.has('search')
      ? 'all'
      : rememberedKind;
  const [query, setQuery] = usePageState('library:query', '');
  const [sort, setSort] = usePageState<'recent' | 'name'>('library:sort', 'recent');
  const [filters, setFilters] = usePageState<Record<Kind, string>>('library:filters', {
    all: 'all',
    document: 'all',
    note: 'all',
    recipe: 'all',
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [limit, setLimit] = useState(40);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (params.has('search')) input.current?.focus();
  }, [params.get('search')]);
  useEffect(() => setLimit(40), [query, kind, filters, sort]);
  const filter = filters[kind] || 'all';
  const setFilter = (value: string) => setFilters((current) => ({ ...current, [kind]: value }));
  const all = useMemo(() => libraryRecords(data), [data.recipes, data.documents, data.notes]);
  const subset = all.filter((record) => kind === 'all' || record.kind === kind);
  const options = [
    { value: 'all', label: '全部记录' },
    ...(kind === 'all' || kind === 'document' || kind === 'recipe'
      ? [{ value: 'saved', label: '重要与收藏' }]
      : []),
    ...(kind === 'all' || kind === 'document'
      ? [{ value: 'expiring', label: '30 天内到期与已过期' }]
      : []),
    ...[
      ...new Set(
        subset.flatMap((record) => (record.kind === 'note' ? [] : [record.item.category])),
      ),
    ].map((value) => ({ value: 'category:' + value, label: value })),
    ...[
      ...new Set(subset.flatMap((record) => (record.kind === 'note' ? [record.item.mood] : []))),
    ].map((value) => ({ value: 'mood:' + value, label: '心情 · ' + value })),
    ...[
      ...new Set(
        subset.flatMap((record) => (record.kind === 'note' ? [] : record.item.tags || [])),
      ),
    ].map((value) => ({ value: 'tag:' + value, label: '#' + value })),
  ];
  const shown = subset
    .filter((record) => recordText(record).toLowerCase().includes(query.trim().toLowerCase()))
    .filter((record) => {
      if (filter === 'all') return true;
      if (filter === 'saved')
        return record.kind === 'document'
          ? record.item.important
          : record.kind === 'recipe'
            ? record.item.favorite
            : false;
      if (filter === 'expiring')
        return (
          record.kind === 'document' &&
          record.item.expiryDate &&
          (daysFromDate(record.item.expiryDate) ?? 31) <= 30
        );
      if (filter.startsWith('mood:'))
        return record.kind === 'note' && record.item.mood === filter.slice(5);
      if (filter.startsWith('category:'))
        return record.kind !== 'note' && record.item.category === filter.slice(9);
      return record.kind !== 'note' && record.item.tags?.includes(filter.slice(4));
    })
    .sort((a, b) =>
      sort === 'name'
        ? a.item.title.localeCompare(b.item.title, 'zh-CN')
        : b.item.createdAt - a.item.createdAt,
    );
  function changeKind(next: Kind) {
    setRememberedKind(next);
    setParams({ type: next });
  }
  return (
    <div className="records-page">
      <PageHeading
        title="记录"
        description={all.length + ' 条'}
        action={
          <Button
            variant="filled"
            size="sm"
            leftSection={<Plus size={17} />}
            onClick={() => onAdd(kind)}
          >
            {kind === 'document' ? '存资料' : kind === 'recipe' ? '记菜谱' : '记一下'}
          </Button>
        }
      />
      <div className="record-tabs" role="tablist" aria-label="记录类型">
        {kinds.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={kind === item.value}
            onClick={() => changeKind(item.value)}
          >
            {item.label}
            {all.length > 0 && (
              <span className="record-tab-count">
                {item.value === 'all'
                  ? all.length
                  : all.filter((record) => record.kind === item.value).length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="library-controls">
        <div className="library-search">
          <TextInput
            ref={input}
            aria-label="搜索记录"
            placeholder="搜索记录"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            leftSection={<Search size={18} />}
            rightSection={
              query ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setQuery('')}
                  aria-label="清除搜索"
                >
                  <X size={16} />
                </ActionIcon>
              ) : null
            }
          />
        </div>
        <div className="library-toolbar">
          <div>
            {kind !== 'recipe' && (
              <button
                type="button"
                aria-label={
                  '筛选记录：' +
                  (options.find((option) => option.value === filter)?.label || '全部记录')
                }
                title="筛选记录"
                className={filter !== 'all' ? 'is-filtered' : ''}
                onClick={() => {
                  setFilterQuery('');
                  setFilterOpen(true);
                }}
              >
                <ListFilter size={19} aria-hidden="true" />
              </button>
            )}
            <Menu withinPortal position="bottom-end">
              <Menu.Target>
                <button
                  type="button"
                  aria-label="记录排序"
                  title={sort === 'recent' ? '最近添加' : '按名称排列'}
                >
                  <ArrowDownUp size={18} aria-hidden="true" />
                </button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  onClick={() => setSort('recent')}
                  rightSection={sort === 'recent' ? <Check size={15} /> : null}
                >
                  最近添加
                </Menu.Item>
                <Menu.Item
                  onClick={() => setSort('name')}
                  rightSection={sort === 'name' ? <Check size={15} /> : null}
                >
                  按名称排列
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>
      </div>
      {kind !== 'recipe' && (query.trim() || filter !== 'all') && (
        <p className="library-result-count" role="status">
          {shown.length} 条结果
          {filter !== 'all'
            ? ' · ' + (options.find((option) => option.value === filter)?.label || '已筛选')
            : ''}
        </p>
      )}
      {kind === 'recipe' ? (
        <div className="recipe-library">
          <RecipesPage
            recipes={data.recipes}
            embedded
            query={query}
            onQueryChange={setQuery}
            sort={sort === 'name' ? '名称排序' : '最近添加'}
            onSortChange={(value) => setSort(value === '名称排序' ? 'name' : 'recent')}
            onAdd={() => onAdd('recipe')}
            onOpen={(item) => onOpen({ kind: 'recipe', item })}
          />
        </div>
      ) : (
        <>
          <div className="record-list">
            {shown.slice(0, limit).map((record) => (
              <RecordRow key={record.kind + record.item.id} record={record} onOpen={onOpen} />
            ))}
          </div>
          {shown.length > limit && (
            <Button variant="subtle" fullWidth onClick={() => setLimit((value) => value + 40)}>
              再显示 40 条
            </Button>
          )}
          {!shown.length && !all.length && kind === 'all' && !query.trim() && filter === 'all' && (
            <div className="library-start">
              <span className="empty-symbol">
                <Library size={26} aria-hidden="true" />
              </span>
              <h2>还没有记录</h2>
              <p>随记、资料和菜谱，都收在这里。</p>
              <Button
                leftSection={<Plus size={17} aria-hidden="true" />}
                onClick={() => onAdd('note')}
              >
                写一条随记
              </Button>
              <div className="library-start-options">
                <button type="button" onClick={() => onAdd('document')}>
                  <FileText size={17} aria-hidden="true" />
                  存资料
                </button>
                <button type="button" onClick={() => onAdd('recipe')}>
                  <Utensils size={17} aria-hidden="true" />
                  记菜谱
                </button>
              </div>
            </div>
          )}
          {!shown.length &&
            (all.length > 0 || kind !== 'all' || !!query.trim() || filter !== 'all') && (
              <div className="empty-library">
                {query.trim() || filter !== 'all' ? (
                  <Search size={28} aria-hidden="true" />
                ) : kind === 'document' ? (
                  <FileText size={28} aria-hidden="true" />
                ) : (
                  <NotebookPen size={28} aria-hidden="true" />
                )}
                <h3>{query.trim() || filter !== 'all' ? '没有找到这条记录' : '这里还没有记录'}</h3>
                <p>
                  {query.trim() || filter !== 'all'
                    ? '换个关键词，或清除当前筛选试试。'
                    : '从一张图片、一段文字开始。'}
                </p>
                {query.trim() || filter !== 'all' ? (
                  <Button
                    variant="light"
                    onClick={() => {
                      setQuery('');
                      setFilter('all');
                    }}
                  >
                    清除搜索与筛选
                  </Button>
                ) : (
                  <Button variant="light" onClick={() => onAdd(kind)}>
                    记下第一条
                  </Button>
                )}
              </div>
            )}
        </>
      )}
      <Drawer
        opened={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="筛选记录"
        position="bottom"
        radius="lg"
        size="min(75dvh, 560px)"
        closeButtonProps={{ size: 44, 'aria-label': '关闭筛选' }}
      >
        <TextInput
          aria-label="查找筛选条件"
          placeholder="查找分类或标签"
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.currentTarget.value)}
          leftSection={<Search size={17} />}
        />
        <div className="filter-option-list">
          {options
            .filter((option) => option.label.includes(filterQuery.trim()))
            .map((option) => (
              <button
                type="button"
                key={option.value}
                aria-pressed={filter === option.value}
                onClick={() => {
                  setFilter(option.value);
                  setFilterOpen(false);
                }}
              >
                {option.label}
                {filter === option.value && <Check size={17} />}
              </button>
            ))}
        </div>
      </Drawer>
    </div>
  );
}
