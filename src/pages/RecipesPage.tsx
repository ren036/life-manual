import { Search, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttachmentPreview } from '../components/AttachmentPreview';
import type { Recipe } from '../types';

export function RecipesPage({ recipes, onOpen }: { recipes: Recipe[]; onOpen: (item: Recipe) => void }) {
  const [filter, setFilter] = useState('全部');
  const [query, setQuery] = useState('');
  const categories = ['全部', ...new Set(recipes.map((item) => item.category))];
  const shown = useMemo(() => recipes.filter((item) => (filter === '全部' || item.category === filter) && `${item.title} ${item.notes} ${item.ingredients.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [filter, query, recipes]);
  return <section><label className="search-field"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜菜名或食材" /></label><div className="filter-scroll">{categories.map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>{shown.length ? <div className="recipe-grid">{shown.map((item) => <button className="food-card" key={item.id} onClick={() => onOpen(item)}><div className="food-photo">{item.hasFile ? <AttachmentPreview id={item.id} enabled alt={item.title} /> : <span className="food-placeholder"><Utensils /></span>}</div><div className="food-copy"><span>{item.category}</span><strong>{item.title}</strong><small>{item.ingredients.length ? item.ingredients.join(' · ') : '还没有记录食材'}</small></div></button>)}</div> : <p className="empty-state">还没有符合条件的菜。</p>}</section>;
}
