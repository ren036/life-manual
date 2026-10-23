import { ActionIcon, Button } from '@mantine/core';
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCheck,
  Circle,
  FilePlus2,
  Library,
  NotebookPen,
  Plus,
  Utensils,
} from 'lucide-react';
import { RecordRow } from '../components/RecordRow';
import { daysFromDate, taskDueLabel } from '../dueDates';
import type { LibraryRecord } from '../library';
import type { DocumentItem, TaskItem } from '../types';

interface Props {
  records: LibraryRecord[];
  recent: LibraryRecord[];
  tasks: TaskItem[];
  documents: DocumentItem[];
  busyTaskIds: Set<string>;
  onOpenRecord: (record: LibraryRecord) => void;
  onEditTask: (task: TaskItem) => void;
  onToggleTask: (task: TaskItem) => void;
  onAddNote: () => void;
  onAddDocument: () => void;
  onAddRecipe: () => void;
  onAddTask: () => void;
  onViewTasks: () => void;
  onViewRecords: () => void;
  backupOverdue: boolean;
  onBackup: () => void;
}

export function TodayPage({
  records,
  recent,
  tasks,
  documents,
  busyTaskIds,
  onOpenRecord,
  onEditTask,
  onToggleTask,
  onAddNote,
  onAddDocument,
  onAddRecipe,
  onAddTask,
  onViewTasks,
  onViewRecords,
  backupOverdue,
  onBackup,
}: Props) {
  const pending = tasks.filter((task) => !task.completed);
  const actionable = pending
    .filter((task) => (daysFromDate(task.dueDate) ?? 1) <= 0)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const upcoming = pending
    .filter((task) => (daysFromDate(task.dueDate) ?? 1) > 0)
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const shownTasks = (actionable.length ? actionable : upcoming).slice(0, 4);
  const dueDocuments = documents
    .filter((item) => item.expiryDate && (daysFromDate(item.expiryDate) ?? 31) <= 30)
    .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))
    .slice(0, 2);
  const recentRecords = (
    recent.length ? recent : [...records].sort((a, b) => b.item.createdAt - a.item.createdAt)
  ).slice(0, 4);
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  return (
    <div className="today-page">
      <header className="today-intro">
        <h1>今天</h1>
        <p className="today-date">{date}</p>
      </header>
      <div className="capture-panel">
        <button type="button" className="capture-input" onClick={onAddNote}>
          <NotebookPen size={21} aria-hidden="true" />
          <span>记下一点什么…</span>
          <Plus size={20} aria-hidden="true" />
        </button>
        <div className="capture-shortcuts" aria-label="快速新建">
          <button type="button" onClick={onAddDocument}>
            <FilePlus2 size={18} aria-hidden="true" />
            存资料
          </button>
          <button type="button" onClick={onAddRecipe}>
            <Utensils size={18} aria-hidden="true" />
            记菜谱
          </button>
          <button type="button" onClick={onAddTask}>
            <Plus size={18} aria-hidden="true" />
            加待办
          </button>
        </div>
      </div>

      <section className="today-section">
        <div className="section-heading">
          <h2>
            {actionable.length ? '今天要做' : '接下来'}
            {pending.length > 0 && (
              <span className="section-total">{actionable.length || pending.length}</span>
            )}
          </h2>
          <button type="button" onClick={pending.length ? onViewTasks : onAddTask}>
            {pending.length ? '全部待办' : '添加待办'}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        {shownTasks.length ? (
          <div className="daily-tasks">
            {shownTasks.map((task) => (
              <div className="daily-task" key={task.id}>
                <ActionIcon
                  size={44}
                  variant="subtle"
                  color="blue"
                  disabled={busyTaskIds.has(task.id)}
                  loading={busyTaskIds.has(task.id)}
                  onClick={() => onToggleTask(task)}
                  aria-label={'完成待办：' + task.title}
                >
                  <Circle size={22} strokeWidth={1.6} aria-hidden="true" />
                </ActionIcon>
                <button type="button" onClick={() => onEditTask(task)}>
                  <strong>{task.title}</strong>
                  <small className={(daysFromDate(task.dueDate) ?? 0) < 0 ? 'text-danger' : ''}>
                    {taskDueLabel(task.dueDate)}
                    {task.priority !== '普通' ? ' · ' + task.priority : ''}
                  </small>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="calm-empty">
            <span className="empty-check">
              <CheckCheck size={23} aria-hidden="true" />
            </span>
            <div>
              <strong>今天没有临近事项</strong>
              <p>需要做的事，随手加一条。</p>
            </div>
          </div>
        )}
      </section>

      {!!dueDocuments.length && (
        <section className="today-section">
          <div className="section-heading">
            <h2>资料到期提醒</h2>
          </div>
          <div className="today-records">
            {dueDocuments.map((item) => (
              <RecordRow key={item.id} record={{ kind: 'document', item }} onOpen={onOpenRecord} />
            ))}
          </div>
        </section>
      )}

      <section className="today-section">
        <div className="section-heading">
          <h2>{recent.length ? '最近打开' : '最近记录'}</h2>
          <button type="button" onClick={onViewRecords}>
            全部记录
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        {recentRecords.length ? (
          <div className="today-records">
            {recentRecords.map((record) => (
              <RecordRow key={record.kind + record.item.id} record={record} onOpen={onOpenRecord} />
            ))}
          </div>
        ) : (
          <div className="daily-library-empty">
            <span className="empty-symbol">
              <Library size={25} aria-hidden="true" />
            </span>
            <h3>留下一条记录</h3>
            <p>想法、资料和菜谱，随时回来翻看。</p>
            <Button
              variant="light"
              leftSection={<Plus size={17} aria-hidden="true" />}
              onClick={onAddNote}
            >
              记一下
            </Button>
          </div>
        )}
      </section>
      {backupOverdue && (
        <button type="button" className="backup-reminder" onClick={onBackup}>
          <ArrowDownToLine size={17} aria-hidden="true" />
          <span>该备份了，保存一份手册副本</span>
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
