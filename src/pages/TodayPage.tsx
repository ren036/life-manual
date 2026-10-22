import { ActionIcon, Button, Group, Text, UnstyledButton } from '@mantine/core';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Circle,
  FilePlus2,
  Plus,
  SquarePen,
} from 'lucide-react';
import { PageHeading } from '../components/PageHeading';
import { RecordRow } from '../components/RecordRow';
import { daysFromDate, taskDueLabel } from '../dueDates';
import { shortDate, type LibraryRecord } from '../library';
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
  onAddTask,
  onViewTasks,
  onViewRecords,
  backupOverdue,
  onBackup,
}: Props) {
  const actionable = tasks
    .filter((task) => !task.completed && (daysFromDate(task.dueDate) ?? 1) <= 0)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const dueDocuments = documents
    .filter((item) => item.expiryDate && (daysFromDate(item.expiryDate) ?? 31) <= 30)
    .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))
    .slice(0, 3);
  const recentRecords = recent.length
    ? recent
    : [...records].sort((a, b) => b.item.createdAt - a.item.createdAt).slice(0, 4);
  return (
    <div className="today-page">
      <PageHeading
        title="今天"
        description={new Intl.DateTimeFormat('zh-CN', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }).format(new Date())}
        action={
          <span className="daily-mark">
            {new Date().getDate().toString().padStart(2, '0')}
            <small>日常一页</small>
          </span>
        }
      />
      <button type="button" className="capture-banner" onClick={onAddNote}>
        <span className="capture-icon">
          <SquarePen size={25} strokeWidth={1.5} />
        </span>
        <span>
          <strong>记一下</strong>
          <small>记下刚想到的事</small>
        </span>
        <Plus size={23} strokeWidth={1.6} />
      </button>
      <div className="quick-links">
        <button type="button" onClick={onAddDocument}>
          <FilePlus2 size={17} />
          保存一份资料
        </button>
        <span />
        <button type="button" onClick={onAddTask}>
          <Plus size={17} />
          添一件待办
        </button>
      </div>
      <section className="today-section">
        <div className="section-heading">
          <h2>今天要做</h2>
          <button type="button" onClick={onViewTasks}>
            全部待办
            <ArrowRight size={14} />
          </button>
        </div>
        {actionable.length ? (
          <div className="daily-tasks">
            {actionable.slice(0, 5).map((task) => (
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
                  <Circle size={22} strokeWidth={1.5} />
                </ActionIcon>
                <button type="button" onClick={() => onEditTask(task)}>
                  <strong>{task.title}</strong>
                  <small className={(daysFromDate(task.dueDate) ?? 0) < 0 ? 'text-danger' : ''}>
                    {taskDueLabel(task.dueDate)}
                  </small>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="calm-empty">
            <span className="empty-check">
              <Check size={19} />
            </span>
            <div>
              <strong>今天没有到期的待办</strong>
              <p>有空时，也可以看看接下来的安排。</p>
            </div>
          </div>
        )}
      </section>
      {!!dueDocuments.length && (
        <section className="today-section">
          <div className="section-heading">
            <h2>资料提醒</h2>
            <span className="section-count">到期与保修</span>
          </div>
          {dueDocuments.map((item) => (
            <RecordRow key={item.id} record={{ kind: 'document', item }} onOpen={onOpenRecord} />
          ))}
        </section>
      )}
      <section className="today-section">
        <div className="section-heading">
          <h2>{recent.length ? '最近打开' : '最近记录'}</h2>
          <button type="button" onClick={onViewRecords}>
            全部记录
            <ArrowRight size={14} />
          </button>
        </div>
        {recentRecords.length ? (
          recentRecords.map((record) => (
            <RecordRow key={record.kind + record.item.id} record={record} onOpen={onOpenRecord} />
          ))
        ) : (
          <div className="empty-library">
            <SquarePen size={26} strokeWidth={1.3} />
            <h3>从一条小记录开始</h3>
            <p>随记、家庭资料、喜欢的菜，慢慢收在这里。</p>
            <Button variant="light" onClick={onAddNote}>
              写下第一条
            </Button>
          </div>
        )}
      </section>
      {backupOverdue && (
        <button type="button" className="backup-reminder" onClick={onBackup}>
          <ArrowDownToLine size={17} />
          <span>有一阵子没备份了，保存一份副本吧。</span>
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
