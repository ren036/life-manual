import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  Radio,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, Moon, Pencil, Settings, Sun, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AddRecordSheet } from './components/AddRecordSheet';
import { BottomNav } from './components/BottomNav';
import { CookingRecordSheet } from './components/CookingRecordSheet';
import { OrganizeSheet } from './components/OrganizeSheet';
import { NoteSheet } from './components/NoteSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { TrashSheet } from './components/TrashSheet';
import { WelcomeGuide } from './components/WelcomeGuide';
import { isBackupOverdue } from './dataSafety';
import { DocumentsPage } from './pages/DocumentsPage';
import { HomePage } from './pages/HomePage';
import { NotesPage } from './pages/NotesPage';
import { RecipesPage } from './pages/RecipesPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { TasksPage } from './pages/TasksPage';
import { nextTaskDueDate } from './recurrence';
import { relatedRecordKey } from './relatedRecords';
import {
  advanceTask,
  bulkUpdateItems,
  claimReminderDate,
  clearAllData,
  deleteRecord,
  deleteNote,
  deleteTask,
  emptyTrash,
  exportBackup,
  getAttachmentFiles,
  importBackup,
  insertDocument,
  insertNote,
  insertRecipe,
  insertTask,
  loadAppData,
  loadTrash,
  parseBackup,
  permanentlyDeleteTrashEntry,
  restoreRecord,
  reopenRecurringTask,
  restoreTrashEntry,
  setReminderEnabled,
  updateRecord,
  updateNote,
  updateTask,
} from './storage/database';
import type { ImportMode } from './storage/database';
import type {
  AddMode,
  AppTab,
  CookingRecord,
  DocumentItem,
  NoteEntry,
  PendingAttachment,
  Recipe,
  RelatedRecordRef,
  TaskItem,
  TrashEntry,
} from './types';

const pageTitles: Record<AppTab, string> = {
  home: '生活手册',
  notes: '随记与心情',
  recipes: '我的菜谱',
  documents: '资料库',
  tasks: '待办事项',
};
const ONBOARDING_KEY = 'life-manual-onboarding-v1';
const LAST_BACKUP_KEY = 'life-manual-last-backup-at';
const BACKUP_BASELINE_KEY = 'life-manual-backup-baseline';
type SavedItem = Recipe | DocumentItem | TaskItem;
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
function dateKey(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function daysFromToday(value: string, today: string): number {
  return Math.round(
    (new Date(`${value}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000,
  );
}
async function configurePeriodicReminders(enabled: boolean) {
  const registration = await navigator.serviceWorker.ready;
  const periodicSync = (
    registration as ServiceWorkerRegistration & {
      periodicSync?: {
        register: (tag: string, options: { minInterval: number }) => Promise<void>;
        unregister: (tag: string) => Promise<void>;
      };
    }
  ).periodicSync;
  if (enabled) await periodicSync?.register('life-manual-reminders', { minInterval: 86400000 });
  else await periodicSync?.unregister('life-manual-reminders');
}
function readRoute(): { tab: AppTab; id?: string } {
  const [tab, id] = window.location.hash.slice(1).split('/');
  return {
    tab: ['notes', 'recipes', 'documents', 'tasks'].includes(tab) ? (tab as AppTab) : 'home',
    id: tab === 'recipes' || tab === 'documents' ? id : undefined,
  };
}

export default function App() {
  const { setColorScheme } = useMantineColorScheme();
  const colorScheme = useComputedColorScheme('light');
  const dark = colorScheme === 'dark';
  const [route, setRoute] = useState(readRoute);
  const tab = route.tab;
  const setTab = (next: AppTab) => {
    window.location.hash = next;
  };
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteEntry>();
  const [trashItems, setTrashItems] = useState<TrashEntry[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | undefined>(() => {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  });
  const [backupBaseline, setBackupBaseline] = useState(() => {
    const saved = Number(localStorage.getItem(BACKUP_BASELINE_KEY));
    if (Number.isFinite(saved) && saved > 0) return saved;
    const value = Date.now();
    localStorage.setItem(BACKUP_BASELINE_KEY, String(value));
    return value;
  });
  const [loading, setLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== 'done',
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe>();
  const [editingCookingRecord, setEditingCookingRecord] = useState<CookingRecord>();
  const [editingItem, setEditingItem] = useState<SavedItem>();
  const [addMode, setAddMode] = useState<AddMode>('tasks');
  const [defaultRelatedRecord, setDefaultRelatedRecord] = useState<RelatedRecordRef>();
  const setToast = (message: string) =>
    notifications.show({
      message,
      color: 'green',
      radius: 'lg',
      withBorder: true,
    });
  const setErrorToast = (message: string) =>
    notifications.show({
      message,
      color: 'red',
      radius: 'lg',
      withBorder: true,
    });
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () =>
      'Notification' in window &&
      Notification.permission === 'granted' &&
      localStorage.getItem('life-manual-notifications') === 'on',
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent>();
  const taskActionsRef = useRef(new Set<string>());
  const [busyTaskIds, setBusyTaskIds] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const [data, trash] = await Promise.all([loadAppData(), loadTrash()]);
    setRecipes(data.recipes);
    setDocuments(data.documents);
    setTasks(data.tasks);
    setNotes(data.notes);
    setTrashItems(trash);
  };
  useEffect(() => {
    if (onboardingOpen) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const sync = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('beforeinstallprompt', captureInstall);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('beforeinstallprompt', captureInstall);
    };
  }, []);
  useEffect(() => {
    if (loading || !notificationsEnabled || Notification.permission !== 'granted') return;
    const today = dateKey();
    const taskDays = tasks
      .filter((item) => !item.completed && item.dueDate)
      .map((item) => daysFromToday(item.dueDate!, today));
    const documentDays = documents
      .filter((item) => item.expiryDate)
      .map((item) => daysFromToday(item.expiryDate!, today));
    const dueTasks = taskDays.filter((days) => days >= 0 && days <= 7).length;
    const overdueTasks = taskDays.filter((days) => days < 0).length;
    const expiring = documentDays.filter((days) => days >= 0 && days <= 7).length;
    const expired = documentDays.filter((days) => days < 0).length;
    if (!dueTasks && !overdueTasks && !expiring && !expired) return;
    const parts = [
      dueTasks ? `${dueTasks} 个待办将在 7 天内到期` : '',
      overdueTasks ? `${overdueTasks} 个待办已逾期` : '',
      expiring ? `${expiring} 份资料将在 7 天内到期` : '',
      expired ? `${expired} 份资料已过期` : '',
    ].filter(Boolean);
    claimReminderDate(today)
      .then((claimed) => {
        if (!claimed) return undefined;
        return navigator.serviceWorker.ready;
      })
      .then((registration) =>
        registration
          ? registration.showNotification('生活手册提醒', {
              body: parts.join('，'),
              icon: '/icon.svg',
              tag: `life-manual-reminder-${today}`,
            })
          : undefined,
      )
      .catch(() => undefined);
  }, [documents, loading, notificationsEnabled, tasks]);
  useEffect(() => {
    if (loading) return;
    void setReminderEnabled(notificationsEnabled);
    void configurePeriodicReminders(notificationsEnabled).catch(() => undefined);
  }, [loading, notificationsEnabled]);

  function startAdd(mode: AddMode, relatedRecord?: RelatedRecordRef) {
    setEditingItem(undefined);
    setDefaultRelatedRecord(relatedRecord);
    setAddMode(mode);
    setSheetOpen(true);
  }
  function startEdit(item: SavedItem) {
    setEditingItem(item);
    setDefaultRelatedRecord(undefined);
    setAddMode('ingredients' in item ? 'recipes' : 'description' in item ? 'documents' : 'tasks');
    setSheetOpen(true);
  }
  async function saveItem(item: SavedItem, files: PendingAttachment[]) {
    if (editingItem) {
      if ('completed' in item && 'completed' in editingItem) {
        await updateTask(item);
        setTasks((current) => current.map((task) => (task.id === item.id ? item : task)));
      } else if (!('completed' in item) && !('completed' in editingItem)) {
        await updateRecord(item, editingItem, files);
        if ('ingredients' in item)
          setRecipes((current) => current.map((record) => (record.id === item.id ? item : record)));
        else
          setDocuments((current) =>
            current.map((record) => (record.id === item.id ? item : record)),
          );
        window.location.hash = ('ingredients' in item ? 'recipes/' : 'documents/') + item.id;
      }
      setSheetOpen(false);
      setEditingItem(undefined);
      setToast('修改已保存');
      return;
    }
    if (addMode === 'recipes') {
      await insertRecipe(item as Recipe, files);
      setRecipes((current) => [item as Recipe, ...current]);
    } else if (addMode === 'documents') {
      await insertDocument(item as DocumentItem, files);
      setDocuments((current) => [item as DocumentItem, ...current]);
    } else {
      await insertTask(item as TaskItem);
      setTasks((current) => [item as TaskItem, ...current]);
    }
    setSheetOpen(false);
    setTab(addMode);
    setDefaultRelatedRecord(undefined);
    setToast('已经保存好了');
  }
  async function saveNote(note: NoteEntry, audio?: PendingAttachment) {
    if (editingNote) {
      await updateNote(note, editingNote, audio);
      setNotes((current) => current.map((item) => (item.id === note.id ? note : item)));
      setToast('随记已更新');
    } else {
      await insertNote(note, audio);
      setNotes((current) => [note, ...current]);
      setToast('这一刻已经记下了');
    }
    setEditingNote(undefined);
    setNoteSheetOpen(false);
  }

  function startNote(note?: NoteEntry) {
    setEditingNote(note);
    setNoteSheetOpen(true);
  }

  async function removeNote(item: NoteEntry) {
    try {
      await deleteNote(item);
      setNotes((current) => current.filter((note) => note.id !== item.id));
      setTrashItems(await loadTrash());
      setToast(`已删除随记“${item.title}”`);
    } catch {
      setErrorToast('删除失败，请重试');
    }
  }
  async function toggleTask(item: TaskItem) {
    if (taskActionsRef.current.has(item.id)) return;
    taskActionsRef.current.add(item.id);
    setBusyTaskIds((current) => new Set(current).add(item.id));
    try {
      const updated = {
        ...item,
        completed: !item.completed,
        completedAt: item.completed ? undefined : Date.now(),
        skipped: item.completed ? undefined : false,
      };
      if (item.completed && item.repeat) {
        const linkedGenerated = tasks.find(
          (task) => task.generatedFromTaskId === item.id && !task.completed && !task.deletedAt,
        );
        const legacySeriesTasks = linkedGenerated
          ? []
          : tasks.filter(
              (task) =>
                !task.generatedFromTaskId &&
                !task.deletedAt &&
                task.id !== item.id &&
                task.title === item.title &&
                task.repeat === item.repeat &&
                task.repeatInterval === item.repeatInterval &&
                task.repeatUnit === item.repeatUnit &&
                task.repeatAnchorDate === item.repeatAnchorDate &&
                task.createdAt >= (item.completedAt || item.createdAt),
            );
        if (legacySeriesTasks.some((task) => task.completed)) {
          setErrorToast('这个重复计划已有后续完成记录，不能直接恢复较早的一次');
          return;
        }
        const generated = linkedGenerated || legacySeriesTasks.find((task) => !task.completed);
        if (generated) {
          await reopenRecurringTask(updated, generated.id);
          setTasks((current) =>
            current
              .filter((task) => task.id !== generated.id)
              .map((task) => (task.id === item.id ? updated : task)),
          );
          setToast('已恢复，并撤销自动创建的下一次待办');
          return;
        }
        if (tasks.some((task) => task.generatedFromTaskId === item.id)) {
          setErrorToast('后续待办已经完成或删除，不能直接恢复这一次');
          return;
        }
        if (
          trashItems.some(
            (entry) =>
              entry.kind === 'task' &&
              (entry.item.generatedFromTaskId === item.id ||
                (!entry.item.generatedFromTaskId &&
                  entry.item.id !== item.id &&
                  entry.item.title === item.title &&
                  entry.item.repeat === item.repeat &&
                  entry.item.repeatInterval === item.repeatInterval &&
                  entry.item.repeatUnit === item.repeatUnit &&
                  entry.item.repeatAnchorDate === item.repeatAnchorDate &&
                  entry.item.createdAt >= (item.completedAt || item.createdAt))),
          )
        ) {
          setErrorToast('自动生成的下一次待办在回收站中，请先处理它再恢复这一次');
          return;
        }
      }
      if (!item.completed && item.repeat) {
        const dueDate = nextTaskDueDate(item);
        if (!dueDate) {
          await advanceTask(updated);
          setTasks((current) => current.map((task) => (task.id === item.id ? updated : task)));
          setToast('已完成，重复计划也已结束');
          return;
        }
        const next: TaskItem = {
          ...item,
          id: crypto.randomUUID(),
          completed: false,
          completedAt: undefined,
          skipped: undefined,
          dueDate,
          createdAt: Date.now(),
          generatedFromTaskId: item.id,
        };
        await advanceTask(updated, next);
        setTasks((current) => [
          next,
          ...current.map((task) => (task.id === item.id ? updated : task)),
        ]);
        setToast(`已创建下一次：${next.dueDate}`);
        return;
      }
      await updateTask(updated);
      setTasks((current) => current.map((task) => (task.id === item.id ? updated : task)));
    } finally {
      taskActionsRef.current.delete(item.id);
      setBusyTaskIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }
  async function skipTask(item: TaskItem) {
    if (taskActionsRef.current.has(item.id)) return;
    taskActionsRef.current.add(item.id);
    setBusyTaskIds((current) => new Set(current).add(item.id));
    try {
      const updated = { ...item, completed: true, completedAt: Date.now(), skipped: true };
      const dueDate = nextTaskDueDate(item);
      if (!dueDate) {
        await advanceTask(updated);
        setTasks((current) => current.map((task) => (task.id === item.id ? updated : task)));
        setToast('已跳过，本次重复计划到此结束');
        return;
      }
      const next: TaskItem = {
        ...item,
        id: crypto.randomUUID(),
        completed: false,
        completedAt: undefined,
        skipped: undefined,
        dueDate,
        createdAt: Date.now(),
        generatedFromTaskId: item.id,
      };
      await advanceTask(updated, next);
      setTasks((current) => [
        next,
        ...current.map((task) => (task.id === item.id ? updated : task)),
      ]);
      setToast(`已跳过本次，下一次：${dueDate}`);
    } finally {
      taskActionsRef.current.delete(item.id);
      setBusyTaskIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }
  async function toggleFavorite(item: Recipe) {
    const updated = { ...item, favorite: !item.favorite };
    await updateRecord(updated, item, []);
    setRecipes((current) => current.map((record) => (record.id === item.id ? updated : record)));
    setToast(updated.favorite ? '已收藏' : '已取消收藏');
  }
  async function addCookingRecord(record: CookingRecord, files: PendingAttachment[]) {
    if (!cookingRecipe) return;
    const updated: Recipe = {
      ...cookingRecipe,
      cookingRecords: editingCookingRecord
        ? (cookingRecipe.cookingRecords || []).map((item) =>
            item.id === editingCookingRecord.id ? record : item,
          )
        : [...(cookingRecipe.cookingRecords || []), record],
    };
    await updateRecord(updated, cookingRecipe, files);
    setRecipes((current) => current.map((recipe) => (recipe.id === updated.id ? updated : recipe)));
    setCookingRecipe(undefined);
    setEditingCookingRecord(undefined);
    setToast(editingCookingRecord ? '下厨记录已更新' : '这次下厨已经记录好了');
  }

  async function removeCookingRecord(recipe: Recipe, record: CookingRecord) {
    try {
      const files = await getAttachmentFiles(record.attachments);
      const updated: Recipe = {
        ...recipe,
        cookingRecords: (recipe.cookingRecords || []).filter((item) => item.id !== record.id),
      };
      await updateRecord(updated, recipe, []);
      setRecipes((current) => current.map((item) => (item.id === recipe.id ? updated : item)));
      let notificationId = '';
      notificationId = notifications.show({
        message: (
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">已删除本次下厨记录</Text>
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => {
                void updateRecord(recipe, updated, files)
                  .then(() => {
                    setRecipes((current) =>
                      current.map((item) => (item.id === recipe.id ? recipe : item)),
                    );
                    notifications.hide(notificationId);
                    setToast('下厨记录已恢复');
                  })
                  .catch(() => setErrorToast('撤销失败，请重试'));
              }}
            >
              撤销
            </Button>
          </Group>
        ),
        color: 'gray',
        radius: 'lg',
        withBorder: true,
        autoClose: 5000,
      });
    } catch {
      setErrorToast('删除下厨记录失败，请重试');
    }
  }
  async function removeTask(item: TaskItem) {
    try {
      await deleteTask(item);
      setTasks((current) => current.filter((task) => task.id !== item.id));
      setTrashItems(await loadTrash());
      let notificationId = '';
      notificationId = notifications.show({
        message: (
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">已删除待办“{item.title}”</Text>
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => {
                void insertTask(item)
                  .then(() => {
                    setTasks((current) => [item, ...current]);
                    void loadTrash().then(setTrashItems);
                    notifications.hide(notificationId);
                    setToast('待办已恢复');
                  })
                  .catch(() => setErrorToast('撤销失败，请重试'));
              }}
            >
              撤销
            </Button>
          </Group>
        ),
        color: 'gray',
        radius: 'lg',
        withBorder: true,
        autoClose: 5000,
      });
    } catch {
      setErrorToast('删除失败，请重试');
    }
  }
  async function removeRecord(item: Recipe | DocumentItem) {
    try {
      const files = await deleteRecord(item);
      if ('ingredients' in item)
        setRecipes((current) => current.filter((record) => record.id !== item.id));
      else setDocuments((current) => current.filter((record) => record.id !== item.id));
      setTab('ingredients' in item ? 'recipes' : 'documents');
      setTrashItems(await loadTrash());
      let notificationId = '';
      notificationId = notifications.show({
        message: (
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">已删除“{item.title}”及关联附件</Text>
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => {
                void restoreRecord(item, files)
                  .then(() => {
                    if ('ingredients' in item) setRecipes((current) => [item, ...current]);
                    else setDocuments((current) => [item, ...current]);
                    void loadTrash().then(setTrashItems);
                    notifications.hide(notificationId);
                    setToast('记录和附件已恢复');
                  })
                  .catch(() => setErrorToast('撤销失败，请重试'));
              }}
            >
              撤销
            </Button>
          </Group>
        ),
        color: 'gray',
        radius: 'lg',
        withBorder: true,
        autoClose: 5000,
      });
    } catch {
      setErrorToast('删除失败，请重试');
    }
  }
  async function completeOnboarding() {
    setLoading(true);
    try {
      await refresh();
      localStorage.setItem(ONBOARDING_KEY, 'done');
      setOnboardingOpen(false);
    } finally {
      setLoading(false);
    }
  }
  async function downloadBackup() {
    const backup = await exportBackup();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `生活手册备份-${dateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const savedAt = Date.now();
    localStorage.setItem(LAST_BACKUP_KEY, String(savedAt));
    setLastBackupAt(savedAt);
    setToast('备份文件已下载');
  }

  async function openTrash() {
    try {
      setTrashItems(await loadTrash());
      setSettingsOpen(false);
      setTrashOpen(true);
    } catch {
      setErrorToast('回收站读取失败，请重试');
    }
  }

  async function restoreFromTrash(entry: TrashEntry) {
    try {
      await restoreTrashEntry(entry);
      await refresh();
      setToast('内容已恢复');
    } catch {
      setErrorToast('恢复失败，请检查设备存储空间');
    }
  }

  function permanentlyRemoveFromTrash(entry: TrashEntry) {
    modals.openConfirmModal({
      centered: true,
      title: '永久删除？',
      children: <Text size="sm">“{entry.item.title}”及其附件将无法恢复。</Text>,
      labels: { confirm: '永久删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await permanentlyDeleteTrashEntry(entry);
          setTrashItems((current) =>
            current.filter((item) => item.kind !== entry.kind || item.item.id !== entry.item.id),
          );
          setToast('已永久删除');
        } catch {
          setErrorToast('永久删除失败，请重试');
        }
      },
    });
  }

  function confirmEmptyTrash() {
    modals.openConfirmModal({
      centered: true,
      title: '清空回收站？',
      children: <Text size="sm">回收站中的所有内容和附件都将无法恢复。</Text>,
      labels: { confirm: '清空', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await emptyTrash();
          setTrashItems([]);
          setToast('回收站已清空');
        } catch {
          setErrorToast('清空失败，请重试');
        }
      },
    });
  }

  function confirmClearAllData() {
    modals.openConfirmModal({
      centered: true,
      title: '清空全部数据？',
      children: (
        <Stack gap="xs">
          <Text size="sm">所有菜谱、资料、待办、随记、附件和回收站内容都会被永久删除。</Text>
          <Text size="sm" c="red" fw={700}>
            此操作无法撤销，建议先导出完整备份。
          </Text>
        </Stack>
      ),
      labels: { confirm: '确认清空', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await clearAllData();
          setRecipes([]);
          setDocuments([]);
          setTasks([]);
          setNotes([]);
          setTrashItems([]);
          setSettingsOpen(false);
          setLastBackupAt(undefined);
          localStorage.removeItem(LAST_BACKUP_KEY);
          const nextBaseline = Date.now();
          localStorage.setItem(BACKUP_BASELINE_KEY, String(nextBaseline));
          setBackupBaseline(nextBaseline);
          setTab('home');
          setToast('全部数据已清空');
        } catch {
          setErrorToast('清空失败，请重试');
        }
      },
    });
  }

  async function organizeItems(
    mode: AddMode,
    ids: string[],
    category?: string,
    tags: string[] = [],
  ) {
    const selected = new Set(ids);
    const organize = <T extends Recipe | DocumentItem | TaskItem>(item: T): T => ({
      ...item,
      category: category || item.category,
      tags: [...new Set([...(item.tags || []), ...tags])].slice(0, 12),
    });
    if (mode === 'recipes') {
      const updated = recipes.filter((item) => selected.has(item.id)).map(organize);
      await bulkUpdateItems(mode, updated);
      setRecipes((current) =>
        current.map((item) => (selected.has(item.id) ? organize(item) : item)),
      );
    } else if (mode === 'documents') {
      const updated = documents.filter((item) => selected.has(item.id)).map(organize);
      await bulkUpdateItems(mode, updated);
      setDocuments((current) =>
        current.map((item) => (selected.has(item.id) ? organize(item) : item)),
      );
    } else {
      const updated = tasks.filter((item) => selected.has(item.id)).map(organize);
      await bulkUpdateItems(mode, updated);
      setTasks((current) => current.map((item) => (selected.has(item.id) ? organize(item) : item)));
    }
    setToast(`已整理 ${ids.length} 项内容`);
  }
  async function toggleNotifications() {
    if (!('Notification' in window)) {
      setToast('当前浏览器不支持通知');
      return;
    }
    if (notificationsEnabled) {
      localStorage.setItem('life-manual-notifications', 'off');
      await setReminderEnabled(false);
      await configurePeriodicReminders(false).catch(() => undefined);
      setNotificationsEnabled(false);
      setToast('到期通知已关闭');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setToast('未获得通知权限');
      return;
    }
    localStorage.setItem('life-manual-notifications', 'on');
    localStorage.removeItem('life-manual-notified-date');
    await setReminderEnabled(true);
    await configurePeriodicReminders(true).catch(() => undefined);
    setNotificationsEnabled(true);
    setToast('到期通知已开启');
  }
  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(undefined);
      setSettingsOpen(false);
    }
  }
  async function restoreBackup(file: File) {
    try {
      const backup = parseBackup(JSON.parse(await file.text()) as unknown);
      let importMode: ImportMode = 'merge';
      modals.openConfirmModal({
        centered: true,
        title: '选择导入方式',
        children: (
          <Stack gap="md">
            <Text size="sm">
              已验证：{backup.recipes.length} 道菜谱、{backup.documents.length} 份资料、
              {backup.tasks.length} 个待办、{backup.notes.length} 条随记、
              {backup.attachments.length} 个附件。导入前会自动创建临时快照，失败时自动回滚。
            </Text>
            <Radio.Group
              defaultValue="merge"
              onChange={(value) => {
                importMode = value as ImportMode;
              }}
            >
              <Stack gap="xs">
                <Radio value="merge" label="合并导入（保留本机其他数据，相同 ID 使用备份版本）" />
                <Radio value="replace" label="覆盖导入（清空本机数据后恢复）" />
              </Stack>
            </Radio.Group>
          </Stack>
        ),
        labels: { confirm: '开始导入', cancel: '取消' },
        confirmProps: { color: 'green' },
        onConfirm: async () => {
          try {
            await importBackup(backup, importMode);
            await refresh();
            window.location.hash = 'home';
            setSettingsOpen(false);
            setToast(importMode === 'merge' ? '备份已合并导入' : '备份已覆盖恢复');
          } catch (error) {
            notifications.show({
              message:
                error instanceof Error ? `导入失败：${error.message}` : '导入失败，原数据已保留',
              color: 'red',
              radius: 'lg',
              withBorder: true,
            });
          }
        },
      });
    } catch (error) {
      notifications.show({
        message:
          error instanceof Error ? `备份无效：${error.message}` : '备份文件无效，未做任何修改',
        color: 'red',
        radius: 'lg',
        withBorder: true,
      });
    }
  }

  const detailItem = route.id
    ? (tab === 'recipes' ? recipes : documents).find((item) => item.id === route.id)
    : undefined;
  const floatingMode: AddMode =
    tab === 'recipes' || tab === 'documents' || tab === 'tasks' ? tab : 'tasks';
  const backupOverdue =
    recipes.length + documents.length + tasks.length + notes.length > 0 &&
    isBackupOverdue(lastBackupAt || backupBaseline);
  const relatedRecordLabels: Record<string, string> = Object.fromEntries([
    ...recipes.map((item) => [
      relatedRecordKey({ kind: 'recipe', id: item.id }),
      `菜谱 · ${item.title}`,
    ]),
    ...documents.map((item) => [
      relatedRecordKey({ kind: 'document', id: item.id }),
      `资料 · ${item.title}`,
    ]),
  ]);
  const relatedRecordOptions = Object.entries(relatedRecordLabels).map(([value, label]) => ({
    value,
    label,
  }));
  const stickyTop = !online ? 38 : 0;
  return (
    <Box component="main" bg="var(--app-frame)" mih="100vh">
      <Paper w="100%" maw={480} mx="auto" mih="100vh" radius={0} shadow="xl" bg="var(--app-bg)">
        {!online && (
          <Paper radius={0} p="xs" bg="var(--mantine-color-orange-light)">
            <Text ta="center" size="xs" c="orange.9">
              当前离线，仍可查看和编辑本机记录
            </Text>
          </Paper>
        )}
        <Box
          component="header"
          pos="sticky"
          top={stickyTop}
          px="md"
          py={10}
          bg="var(--app-header)"
          style={{ zIndex: 20 }}
        >
          <Group justify="space-between" wrap="nowrap" mih={44}>
            <Group gap="xs" wrap="nowrap">
              {route.id && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size={36}
                  onClick={() => setTab(tab)}
                  aria-label="返回列表"
                >
                  <ArrowLeft size={20} />
                </ActionIcon>
              )}
              <Stack gap={1}>
                <Text c={dark ? 'green.3' : 'green.7'} size="xs" fw={700}>
                  {route.id
                    ? pageTitles[tab]
                    : tab === 'home'
                      ? new Intl.DateTimeFormat('zh-CN', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        }).format(new Date())
                      : '生活手册'}
                </Text>
                <Title order={1} size={24} lh={1.15}>
                  {route.id ? (tab === 'recipes' ? '菜谱详情' : '资料详情') : pageTitles[tab]}
                </Title>
              </Stack>
            </Group>
            {route.id ? (
              <Group gap={2} wrap="nowrap">
                {detailItem && (
                  <>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size={36}
                      onClick={() => startEdit(detailItem)}
                      aria-label="编辑记录"
                    >
                      <Pencil size={17} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size={36}
                      onClick={() => removeRecord(detailItem)}
                      aria-label="删除记录"
                    >
                      <Trash2 size={17} />
                    </ActionIcon>
                  </>
                )}
              </Group>
            ) : (
              <Group gap={2} wrap="nowrap">
                <ActionIcon
                  variant="subtle"
                  color={dark ? 'yellow' : 'gray'}
                  size={36}
                  onClick={() => setColorScheme(dark ? 'light' : 'dark')}
                  aria-label={dark ? '开灯' : '关灯'}
                  title={dark ? '开灯' : '关灯'}
                >
                  {dark ? (
                    <Sun key="sun" className="theme-toggle-icon" size={19} />
                  ) : (
                    <Moon key="moon" className="theme-toggle-icon" size={19} />
                  )}
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size={36}
                  onClick={() => setSettingsOpen(true)}
                  aria-label="打开设置"
                >
                  <Settings size={19} />
                </ActionIcon>
              </Group>
            )}
          </Group>
        </Box>
        <Box px="sm" pt="sm" pb={108}>
          {loading && (
            <Text ta="center" c="dimmed" py="xl">
              正在整理你的记录…
            </Text>
          )}
          {!loading &&
            route.id &&
            (detailItem ? (
              <RecordDetailPage
                item={detailItem}
                onToggleFavorite={toggleFavorite}
                onAddCookingRecord={(item) => {
                  setEditingCookingRecord(undefined);
                  setCookingRecipe(item);
                }}
                onEditCookingRecord={(item, record) => {
                  setEditingCookingRecord(record);
                  setCookingRecipe(item);
                }}
                onDeleteCookingRecord={(item, record) => void removeCookingRecord(item, record)}
                relatedTasks={tasks.filter(
                  (task) =>
                    task.relatedRecord?.id === detailItem.id &&
                    task.relatedRecord.kind ===
                      ('ingredients' in detailItem ? 'recipe' : 'document'),
                )}
                onCreateRelatedTask={(item) =>
                  startAdd('tasks', {
                    kind: 'ingredients' in item ? 'recipe' : 'document',
                    id: item.id,
                  })
                }
              />
            ) : (
              <Text ta="center" c="dimmed" py="xl">
                找不到这条记录，请返回列表。
              </Text>
            ))}
          {!loading && !route.id && tab === 'home' && (
            <HomePage
              recipes={recipes}
              documents={documents}
              tasks={tasks}
              onNavigate={setTab}
              onAdd={startAdd}
              onOpenRecipe={(item) => {
                window.location.hash = 'recipes/' + item.id;
              }}
              onOpenDocument={(item) => {
                window.location.hash = 'documents/' + item.id;
              }}
              backupOverdue={backupOverdue}
              onBackup={downloadBackup}
            />
          )}
          {!loading && !route.id && tab === 'recipes' && (
            <RecipesPage
              recipes={recipes}
              onAdd={() => startAdd('recipes')}
              onOpen={(item) => {
                window.location.hash = 'recipes/' + item.id;
              }}
            />
          )}
          {!loading && !route.id && tab === 'notes' && (
            <NotesPage
              notes={notes}
              onAdd={() => startNote()}
              onEdit={startNote}
              onDelete={(item) => void removeNote(item)}
            />
          )}
          {!loading && !route.id && tab === 'documents' && (
            <DocumentsPage
              documents={documents}
              onAdd={() => startAdd('documents')}
              onOpen={(item) => {
                window.location.hash = 'documents/' + item.id;
              }}
            />
          )}
          {!loading && !route.id && tab === 'tasks' && (
            <TasksPage
              tasks={tasks}
              onToggle={toggleTask}
              onEdit={startEdit}
              onDelete={removeTask}
              onSkip={skipTask}
              onAdd={() => startAdd('tasks')}
              busyTaskIds={busyTaskIds}
              relatedRecordLabels={relatedRecordLabels}
              onOpenRelated={(reference) => {
                window.location.hash = `${reference.kind === 'recipe' ? 'recipes' : 'documents'}/${reference.id}`;
              }}
            />
          )}
        </Box>
        <BottomNav
          active={tab}
          onChange={setTab}
          onAdd={
            !route.id && tab !== 'home'
              ? tab === 'notes'
                ? () => startNote()
                : () => startAdd(floatingMode)
              : undefined
          }
        />
        <NoteSheet
          open={noteSheetOpen}
          initialNote={editingNote}
          onClose={() => {
            setNoteSheetOpen(false);
            setEditingNote(undefined);
          }}
          onSave={saveNote}
        />
        <AddRecordSheet
          initialItem={editingItem}
          open={sheetOpen}
          mode={addMode}
          onClose={() => setSheetOpen(false)}
          onSave={saveItem}
          relatedRecordOptions={relatedRecordOptions}
          defaultRelatedRecord={defaultRelatedRecord}
        />
        <CookingRecordSheet
          open={!!cookingRecipe}
          recipeTitle={cookingRecipe?.title || ''}
          initialRecord={editingCookingRecord}
          onClose={() => {
            setCookingRecipe(undefined);
            setEditingCookingRecord(undefined);
          }}
          onSave={addCookingRecord}
        />
        <SettingsSheet
          open={settingsOpen}
          notificationsEnabled={notificationsEnabled}
          onClose={() => setSettingsOpen(false)}
          onToggleNotifications={toggleNotifications}
          onExport={downloadBackup}
          onImport={restoreBackup}
          installAvailable={!!installPrompt}
          onInstall={installApp}
          trashCount={trashItems.length}
          onOpenTrash={() => void openTrash()}
          lastBackupAt={lastBackupAt}
          onOpenOrganize={() => {
            setSettingsOpen(false);
            setOrganizeOpen(true);
          }}
          onClearData={confirmClearAllData}
        />
        <OrganizeSheet
          open={organizeOpen}
          data={{ recipes, documents, tasks, notes }}
          onClose={() => setOrganizeOpen(false)}
          onApply={organizeItems}
        />
        <TrashSheet
          open={trashOpen}
          entries={trashItems}
          onClose={() => setTrashOpen(false)}
          onRestore={(entry) => void restoreFromTrash(entry)}
          onDelete={permanentlyRemoveFromTrash}
          onEmpty={confirmEmptyTrash}
        />
        <WelcomeGuide open={onboardingOpen} onComplete={completeOnboarding} />
      </Paper>
    </Box>
  );
}
