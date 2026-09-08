import {
  ActionIcon,
  Affix,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AddRecordSheet } from './components/AddRecordSheet';
import { BottomNav } from './components/BottomNav';
import { SettingsSheet } from './components/SettingsSheet';
import { DocumentsPage } from './pages/DocumentsPage';
import { HomePage } from './pages/HomePage';
import { RecipesPage } from './pages/RecipesPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { TasksPage } from './pages/TasksPage';
import {
  deleteRecord,
  deleteTask,
  exportBackup,
  importBackup,
  insertDocument,
  insertRecipe,
  insertTask,
  loadAppData,
  updateRecord,
  updateTask,
  validateBackup,
} from './storage/database';
import type { AddMode, AppTab, DocumentItem, PendingAttachment, Recipe, TaskItem } from './types';

const pageTitles: Record<AppTab, string> = {
  home: '生活手册',
  recipes: '我的菜谱',
  documents: '资料库',
  tasks: '待办事项',
};
type SavedItem = Recipe | DocumentItem | TaskItem;
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
function dateKey(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function readRoute(): { tab: AppTab; id?: string } {
  const [tab, id] = window.location.hash.slice(1).split('/');
  return {
    tab: ['recipes', 'documents', 'tasks'].includes(tab) ? (tab as AppTab) : 'home',
    id: tab === 'recipes' || tab === 'documents' ? id : undefined,
  };
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const tab = route.tab;
  const setTab = (next: AppTab) => {
    window.location.hash = next;
  };
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedItem>();
  const [addMode, setAddMode] = useState<AddMode>('tasks');
  const setToast = (message: string) =>
    notifications.show({
      message,
      color: 'green',
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
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent>();

  const refresh = async () => {
    const data = await loadAppData();
    setRecipes(data.recipes);
    setDocuments(data.documents);
    setTasks(data.tasks);
  };
  useEffect(() => {
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
    const showUpdate = () => setUpdateAvailable(true);
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('life-manual-update', showUpdate);
    window.addEventListener('beforeinstallprompt', captureInstall);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('life-manual-update', showUpdate);
      window.removeEventListener('beforeinstallprompt', captureInstall);
    };
  }, []);
  useEffect(() => {
    if (loading || !notificationsEnabled || Notification.permission !== 'granted') return;
    const today = dateKey();
    if (localStorage.getItem('life-manual-notified-date') === today) return;
    const dueTasks = tasks.filter(
      (item) => !item.completed && item.dueDate && item.dueDate <= today,
    ).length;
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const limitDate = limit.toISOString().slice(0, 10);
    const expiring = documents.filter(
      (item) => item.expiryDate && item.expiryDate <= limitDate,
    ).length;
    if (!dueTasks && !expiring) return;
    navigator.serviceWorker.ready
      .then((registration) =>
        registration.showNotification('生活手册提醒', {
          body: `有 ${dueTasks} 个到期待办，${expiring} 份资料即将或已经到期。`,
          icon: '/icon.svg',
          tag: 'life-manual-daily',
        }),
      )
      .catch(() => undefined);
    localStorage.setItem('life-manual-notified-date', today);
  }, [documents, loading, notificationsEnabled, tasks]);

  function startAdd(mode: AddMode) {
    setEditingItem(undefined);
    setAddMode(mode);
    setSheetOpen(true);
  }
  function startEdit(item: SavedItem) {
    setEditingItem(item);
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
    setToast('已经保存好了');
  }
  function nextDueDate(value: string | undefined, repeat: TaskItem['repeat']) {
    const date = new Date(`${value || dateKey()}T00:00:00`);
    if (repeat === '每天') date.setDate(date.getDate() + 1);
    if (repeat === '每周') date.setDate(date.getDate() + 7);
    if (repeat === '每月') date.setMonth(date.getMonth() + 1);
    return dateKey(date);
  }
  async function toggleTask(item: TaskItem) {
    const updated = {
      ...item,
      completed: !item.completed,
      completedAt: item.completed ? undefined : Date.now(),
    };
    await updateTask(updated);
    if (!item.completed && item.repeat) {
      const next = {
        ...item,
        id: crypto.randomUUID(),
        completed: false,
        completedAt: undefined,
        dueDate: nextDueDate(item.dueDate, item.repeat),
        createdAt: Date.now(),
      };
      await insertTask(next);
      setTasks((current) => [
        next,
        ...current.map((task) => (task.id === item.id ? updated : task)),
      ]);
      setToast(`已创建下一次：${next.dueDate}`);
      return;
    }
    setTasks((current) => current.map((task) => (task.id === item.id ? updated : task)));
  }
  async function toggleFavorite(item: Recipe) {
    const updated = { ...item, favorite: !item.favorite };
    await updateRecord(updated, item, []);
    setRecipes((current) => current.map((record) => (record.id === item.id ? updated : record)));
    setToast(updated.favorite ? '已收藏' : '已取消收藏');
  }
  function removeTask(item: TaskItem) {
    modals.openConfirmModal({
      centered: true,
      title: '删除待办？',
      children: <Text size="sm">“{item.title}”删除后无法恢复。</Text>,
      labels: { confirm: '删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteTask(item.id);
        setTasks((current) => current.filter((task) => task.id !== item.id));
        setToast('待办已删除');
      },
    });
  }
  function removeRecord(item: Recipe | DocumentItem) {
    modals.openConfirmModal({
      centered: true,
      title: '删除记录？',
      children: <Text size="sm">“{item.title}”及其关联附件将被永久删除。</Text>,
      labels: { confirm: '删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteRecord(item);
        if ('ingredients' in item)
          setRecipes((current) => current.filter((record) => record.id !== item.id));
        else setDocuments((current) => current.filter((record) => record.id !== item.id));
        setTab('ingredients' in item ? 'recipes' : 'documents');
        setToast('记录已删除');
      },
    });
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
    setToast('备份文件已下载');
  }
  async function toggleNotifications() {
    if (!('Notification' in window)) {
      setToast('当前浏览器不支持通知');
      return;
    }
    if (notificationsEnabled) {
      localStorage.setItem('life-manual-notifications', 'off');
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
  async function applyUpdate() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    });
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  async function restoreBackup(file: File) {
    try {
      const backup: unknown = JSON.parse(await file.text());
      if (!validateBackup(backup)) throw new Error('invalid');
      modals.openConfirmModal({
        centered: true,
        title: '恢复完整备份？',
        children: <Text size="sm">当前所有记录和附件将被备份文件替换。建议先导出当前数据。</Text>,
        labels: { confirm: '确认恢复', cancel: '取消' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          await importBackup(backup);
          await refresh();
          window.location.hash = 'home';
          setToast('备份已恢复');
        },
      });
    } catch {
      setToast('备份文件无效，未做任何修改');
    }
  }

  const detailItem = route.id
    ? (tab === 'recipes' ? recipes : documents).find((item) => item.id === route.id)
    : undefined;
  const floatingMode: AddMode = tab === 'home' ? 'tasks' : tab;
  const stickyTop = !online || updateAvailable ? 38 : 0;
  return (
    <Box component="main" bg="green.0" mih="100vh">
      <Paper w="100%" maw={480} mx="auto" mih="100vh" radius={0} shadow="xl" bg="gray.0">
        {!online && (
          <Paper radius={0} p="xs" bg="orange.1">
            <Text ta="center" size="xs" c="orange.9">
              当前离线，仍可查看和编辑本机记录
            </Text>
          </Paper>
        )}
        {updateAvailable && (
          <Paper radius={0} p="xs" bg="green.9">
            <Group justify="center" gap="sm">
              <Text size="xs" c="white">
                新版本已经准备好
              </Text>
              <Button size="compact-xs" variant="white" color="green" onClick={applyUpdate}>
                立即更新
              </Button>
            </Group>
          </Paper>
        )}
        <Box
          component="header"
          pos="sticky"
          top={stickyTop}
          px="md"
          py={10}
          bg="gray.0"
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
                <Text c="green.7" size="xs" fw={700}>
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
              <ActionIcon
                variant="subtle"
                color="gray"
                size={36}
                onClick={() => setSettingsOpen(true)}
                aria-label="打开设置"
              >
                <Settings size={19} />
              </ActionIcon>
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
              <RecordDetailPage item={detailItem} onToggleFavorite={toggleFavorite} />
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
            />
          )}
          {!loading && !route.id && tab === 'recipes' && (
            <RecipesPage
              recipes={recipes}
              onOpen={(item) => {
                window.location.hash = 'recipes/' + item.id;
              }}
            />
          )}
          {!loading && !route.id && tab === 'documents' && (
            <DocumentsPage
              documents={documents}
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
            />
          )}
        </Box>
        {!route.id && tab !== 'home' && (
          <Affix
            position={{
              bottom: 86,
              left: 'max(0px, calc(50% - 240px))',
              right: 'max(0px, calc(50% - 240px))',
            }}
            zIndex={8}
          >
            <Group justify="flex-end" px="md">
              <ActionIcon
                size={52}
                color="green"
                variant="filled"
                onClick={() => startAdd(floatingMode)}
                aria-label="新增"
              >
                <Plus size={24} />
              </ActionIcon>
            </Group>
          </Affix>
        )}
        <BottomNav active={tab} onChange={setTab} />
        <AddRecordSheet
          initialItem={editingItem}
          open={sheetOpen}
          mode={addMode}
          onClose={() => setSheetOpen(false)}
          onSave={saveItem}
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
        />
      </Paper>
    </Box>
  );
}
