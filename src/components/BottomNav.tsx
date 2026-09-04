import { CheckSquare, Home, Images, Utensils } from 'lucide-react';
import type { AppTab } from '../types';

const items = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'recipes', label: '菜谱', icon: Utensils },
  { id: 'documents', label: '资料库', icon: Images },
  { id: 'tasks', label: '待办', icon: CheckSquare },
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
