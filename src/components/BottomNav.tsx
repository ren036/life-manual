import { Home, Library, Search, Utensils } from 'lucide-react';
import type { AppTab } from '../types';

const items = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'search', label: '搜索', icon: Search },
  { id: 'food', label: '找菜', icon: Utensils },
  { id: 'library', label: '记录', icon: Library },
] as const;

export function BottomNav({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {items.map(({ id, label, icon: Icon }) => (
        <button key={id} aria-current={active === id ? 'page' : undefined} onClick={() => onChange(id)}>
          <Icon aria-hidden="true" /><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
