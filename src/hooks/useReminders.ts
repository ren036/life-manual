import { useEffect, useState } from 'react';
import { daysFromDate, localDateKey } from '../dueDates';
import { configurePeriodicReminders } from '../serviceWorker';
import { claimReminderDate, setReminderEnabled } from '../storage/database';
import { toast } from '../toast';
import type { AppStore } from './useAppData';

const NOTIFICATION_KEY = 'life-manual-notifications';

function reminderText(title: string, date: string, days: number) {
  const day = new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { dateStyle: 'long' });
  return `「${title}」${days < 0 ? '已于' : '将于'}${day}到期`;
}

export function useReminders({ tasks, documents, loading }: AppStore) {
  const [enabled, setEnabled] = useState(
    () =>
      'Notification' in window &&
      Notification.permission === 'granted' &&
      localStorage.getItem(NOTIFICATION_KEY) === 'on',
  );

  useEffect(() => {
    if (loading) return;
    void setReminderEnabled(enabled).catch(() => undefined);
    void configurePeriodicReminders(enabled).catch(() => undefined);
  }, [loading, enabled]);

  useEffect(() => {
    if (loading || !enabled || Notification.permission !== 'granted') return;
    const today = localDateKey();
    const taskParts = tasks.flatMap((item) => {
      if (item.completed || !item.dueDate) return [];
      const days = daysFromDate(item.dueDate, today);
      if (days === undefined || days > 7) return [];
      return [reminderText(item.title, item.dueDate, days)];
    });
    const documentParts = documents.flatMap((item) => {
      if (!item.expiryDate) return [];
      const days = daysFromDate(item.expiryDate, today);
      if (days === undefined || days > 7) return [];
      return [reminderText(item.title, item.expiryDate, days)];
    });
    if (!taskParts.length && !documentParts.length) return;

    const parts = [...taskParts, ...documentParts];
    claimReminderDate(today)
      .then((claimed) => (claimed ? navigator.serviceWorker.ready : undefined))
      .then((registration) =>
        registration?.showNotification('生活手册提醒', {
          body: parts.join('，'),
          icon: '/icon.svg',
          tag: `life-manual-reminder-${today}`,
        }),
      )
      .catch(() => undefined);
  }, [documents, loading, enabled, tasks]);

  async function toggleNotifications() {
    if (!('Notification' in window)) {
      toast('当前浏览器不支持通知');
      return;
    }
    if (!enabled && (await Notification.requestPermission()) !== 'granted') {
      toast('未获得通知权限');
      return;
    }
    const next = !enabled;
    localStorage.setItem(NOTIFICATION_KEY, next ? 'on' : 'off');
    if (next) localStorage.removeItem('life-manual-notified-date');
    setEnabled(next);
    toast(next ? '到期通知已开启' : '到期通知已关闭');
  }

  return { notificationsEnabled: enabled, toggleNotifications };
}
