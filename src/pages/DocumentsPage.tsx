import { FileText, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttachmentPreview } from '../components/AttachmentPreview';
import type { DocumentItem } from '../types';

export function DocumentsPage({ documents, onOpen }: { documents: DocumentItem[]; onOpen: (item: DocumentItem) => void }) {
  const [filter, setFilter] = useState('全部');
  const [query, setQuery] = useState('');
  const categories = ['全部', '重要', ...new Set(documents.map((item) => item.category))];
  const shown = useMemo(() => documents.filter((item) => (filter === '全部' || (filter === '重要' ? item.important : item.category === filter)) && `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [documents, filter, query]);
  return <section><label className="search-field"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索资料" /></label><div className="filter-scroll">{categories.map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="document-list">{shown.map((item) => <button className="document-card" key={item.id} onClick={() => onOpen(item)}><span className="document-preview">{item.hasFile && item.isImage ? <AttachmentPreview id={item.id} enabled alt={item.title} /> : <FileText />}</span><span className="document-copy"><span>{item.category}</span><strong>{item.title}</strong><small>{item.attachmentName || item.description || '暂无说明'}</small></span>{item.important && <Star className="important-star" fill="currentColor" aria-label="重要" />}</button>)}</div>{!shown.length && <p className="empty-state">这个分类还没有资料。</p>}</section>;
}
