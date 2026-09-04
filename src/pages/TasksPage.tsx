import { CalendarDays, Check, Circle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TaskItem } from '../types';

function dueLabel(value?: string) {
  if (!value) return '没有截止日期';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  if (due.getTime() === today.getTime()) return '今天截止';
  if (due < today) return '已逾期';
  return `${due.getMonth() + 1} 月 ${due.getDate()} 日`;
}

export function TasksPage({ tasks, onToggle }: { tasks: TaskItem[]; onToggle: (item: TaskItem) => void }) {
  const [view, setView] = useState<'进行中' | '已完成'>('进行中');
  const shown = useMemo(() => tasks.filter((item) => item.completed === (view === '已完成')), [tasks, view]);
  return <section><div className="task-summary"><div><span>还要做</span><strong>{tasks.filter((item) => !item.completed).length}</strong><small>件事情</small></div><CalendarDays /></div><div className="segmented task-tabs">{(['进行中', '已完成'] as const).map((item) => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}</div><div className="task-list">{shown.map((item) => <article className={`task-card ${item.completed ? 'is-complete' : ''}`} key={item.id}><button className="task-check" onClick={() => onToggle(item)} aria-label={item.completed ? '恢复待办' : '完成待办'}>{item.completed ? <Check /> : <Circle />}</button><div><div className="task-title"><strong>{item.title}</strong><span data-priority={item.priority}>{item.priority}</span></div><p>{item.notes || item.category}</p><small>{item.category} · {dueLabel(item.dueDate)}</small></div></article>)}</div>{!shown.length && <p className="empty-state">这里暂时是空的。</p>}</section>;
}
