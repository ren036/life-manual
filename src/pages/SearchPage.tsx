import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RecordCard } from '../components/RecordCard';
import type { LifeRecord } from '../types';

export function SearchPage({ records, onOpen }: { records: LifeRecord[]; onOpen: (record: LifeRecord) => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const words = query.toLowerCase().split(/[\s，。？、]+/).filter(Boolean);
    return records.filter((record) => words.some((word) => `${record.title} ${record.kind} ${record.detail} ${(record.ingredients || []).join(' ')}`.toLowerCase().includes(word)) || (query.includes('保修') && record.detail.includes('保修')));
  }, [query, records]);
  const examples = ['上次客厅插座怎么换的？', '找出还在保修期的家电', '我做过哪些鸡蛋菜？'];
  return <section><label className="search-field"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="上次客厅插座怎么换的？" /></label>{!query && <div className="suggestions"><p>试试这样问</p>{examples.map((example) => <button key={example} onClick={() => setQuery(example)}>{example}<span>›</span></button>)}</div>}{query && <p className="result-summary">找到 {results.length} 条相关记录</p>}<div className="record-list">{results.map((record) => <RecordCard key={record.id} record={record} onOpen={onOpen} />)}</div>{query && !results.length && <p className="empty-state">没有找到，换个关键词试试。</p>}</section>;
}
