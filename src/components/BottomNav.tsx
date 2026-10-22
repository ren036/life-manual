import { BookOpen, CalendarDays, CheckSquare, Library, Plus, UserRound } from 'lucide-react';
import type { AppTab } from '../types';
const items = [
  { id: 'home', label: '今天', icon: CalendarDays },
  { id: 'records', label: '记录', icon: Library },
  { id: 'tasks', label: '待办', icon: CheckSquare },
  { id: 'profile', label: '我的', icon: UserRound },
] as const;
export function BottomNav({
  active,
  onChange,
  onAdd,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  onAdd?: () => void;
}) {
  const links = (side: boolean) =>
    items.map(({ id, label, icon: Icon }) => (
      <button
        type="button"
        key={id}
        aria-current={active === id ? 'page' : undefined}
        onClick={() => onChange(id)}
      >
        <Icon size={side ? 19 : 21} strokeWidth={active === id ? 1.9 : 1.5} />
        <span>{label}</span>
      </button>
    ));
  return (
    <>
      <aside className="app-sidebar">
        <button type="button" className="sidebar-brand" onClick={() => onChange('home')}>
          <BookOpen size={26} strokeWidth={1.5} />
          <span>
            生活手册<small>把日常，慢慢收好</small>
          </span>
        </button>
        <nav aria-label="侧栏导航">{links(true)}</nav>
        {onAdd && (
          <button type="button" className="sidebar-capture" onClick={onAdd}>
            <Plus size={18} />
            记一下
          </button>
        )}
        <div className="sidebar-footnote">
          <span className="status-dot" />
          自己的记录，留在本机
        </div>
      </aside>
      <nav className="mobile-navigation" aria-label="主要导航">
        {links(false)}
      </nav>
    </>
  );
}
