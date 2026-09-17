import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, Moon, Pencil, Settings, Sun, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { matchPath, Navigate, useLocation, useNavigate, useRoutes } from 'react-router';
import { AddRecordSheet } from './components/AddRecordSheet';
import { BottomNav } from './components/BottomNav';
import { CookingRecordSheet } from './components/CookingRecordSheet';
import { OrganizeSheet } from './components/OrganizeSheet';
import { NoteSheet } from './components/NoteSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { TrashSheet } from './components/TrashSheet';
import { WelcomeGuide } from './components/WelcomeGuide';
import { useAppData } from './hooks/useAppData';
import { useBackup } from './hooks/useBackup';
import { useDeleteActions } from './hooks/useDeleteActions';
import { useEditor } from './hooks/useEditor';
import { useReminders } from './hooks/useReminders';
import { useTaskActions } from './hooks/useTaskActions';
import { useTrash } from './hooks/useTrash';
import { DocumentsPage } from './pages/DocumentsPage';
import { HomePage } from './pages/HomePage';
import { NotesPage } from './pages/NotesPage';
import { RecipesPage } from './pages/RecipesPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { TasksPage } from './pages/TasksPage';
import { relatedRecordKey } from './relatedRecords';
import { onAppUpdateAvailable } from './serviceWorker';
import type { AddMode, AppTab } from './types';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const titles: Record<AppTab, string> = {
  home: '生活手册',
  notes: '随记与心情',
  recipes: '我的菜谱',
  documents: '资料库',
  tasks: '待办事项',
};
function HeaderButton({
  icon,
  label,
  onClick,
  color = 'gray',
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <ActionIcon
      variant="subtle"
      color={color}
      size={36}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
    </ActionIcon>
  );
}
export default function App() {
  const { setColorScheme } = useMantineColorScheme();
  const dark = useComputedColorScheme('light') === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const detailMatch =
    matchPath('/recipes/:id', location.pathname) ?? matchPath('/documents/:id', location.pathname);
  const route = {
    tab: (['notes', 'recipes', 'documents', 'tasks'].find(
      (item) => location.pathname === `/${item}` || location.pathname.startsWith(`/${item}/`),
    ) || 'home') as AppTab,
    id: detailMatch?.params.id,
  };
  const tab = route.tab;
  const setTab = (next: AppTab) => navigate(next === 'home' ? '/' : `/${next}`);
  const openRecord = (kind: 'recipes' | 'documents', id: string) =>
    navigate(`/${kind}/${encodeURIComponent(id)}`);
  const data = useAppData();
  const {
    recipes,
    documents,
    tasks,
    notes,
    trashItems,
    loading,
    onboardingOpen,
    completeOnboarding,
    organizeItems,
  } = data;
  const [panel, setPanel] = useState<'settings' | 'organize' | 'trash' | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent>();

  const {
    editor,
    closeEditor,
    startAdd,
    startEdit,
    startNote,
    startCooking,
    saveItem,
    saveNote,
    addCookingRecord,
    toggleFavorite,
  } = useEditor(data, setTab, openRecord);
  const { removeNote, removeTask, removeRecord, removeCookingRecord } = useDeleteActions(
    data,
    setTab,
  );
  const { busyTaskIds, toggleTask, skipTask } = useTaskActions(data);
  const { notificationsEnabled, toggleNotifications } = useReminders(data);
  const { lastBackupAt, backupOverdue, downloadBackup, restoreBackup, confirmClearAllData } =
    useBackup(data, setTab, () => setPanel(null));
  const { openTrash, restoreFromTrash, permanentlyRemoveFromTrash, confirmEmptyTrash } = useTrash(
    data,
    () => setPanel('trash'),
  );

  useEffect(() => {
    return onAppUpdateAvailable((applyUpdate) => {
      notifications.show({
        id: 'app-update-available',
        message: (
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">发现新版本，点击刷新</Text>
            <Button size="compact-sm" onClick={applyUpdate}>
              刷新
            </Button>
          </Group>
        ),
        color: 'green',
        radius: 'lg',
        withBorder: true,
        withCloseButton: false,
        autoClose: false,
      });
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
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
  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(undefined);
      setPanel(null);
    }
  }
  const detailItem = route.id
    ? (tab === 'recipes' ? recipes : documents).find((item) => item.id === route.id)
    : undefined;
  const floatingMode: AddMode =
    tab === 'recipes' || tab === 'documents' || tab === 'tasks' ? tab : 'tasks';
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
  const detailPage = detailItem ? (
    <RecordDetailPage
      item={detailItem}
      onToggleFavorite={toggleFavorite}
      onAddCookingRecord={startCooking}
      onEditCookingRecord={startCooking}
      onDeleteCookingRecord={(item, record) => void removeCookingRecord(item, record)}
      relatedTasks={tasks.filter(
        (task) =>
          task.relatedRecord?.id === detailItem.id &&
          task.relatedRecord.kind === ('ingredients' in detailItem ? 'recipe' : 'document'),
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
  );
  const page = useRoutes([
    {
      path: '/',
      element: (
        <HomePage
          recipes={recipes}
          documents={documents}
          tasks={tasks}
          onNavigate={setTab}
          onAdd={startAdd}
          onOpenRecipe={(item) => openRecord('recipes', item.id)}
          onOpenDocument={(item) => openRecord('documents', item.id)}
          backupOverdue={backupOverdue}
          onBackup={downloadBackup}
        />
      ),
    },
    { path: '/home', element: <Navigate to="/" replace /> },
    {
      path: '/notes',
      element: (
        <NotesPage
          notes={notes}
          onAdd={() => startNote()}
          onEdit={startNote}
          onDelete={(item) => void removeNote(item)}
        />
      ),
    },
    {
      path: '/recipes',
      element: (
        <RecipesPage
          recipes={recipes}
          onAdd={() => startAdd('recipes')}
          onOpen={(item) => openRecord('recipes', item.id)}
        />
      ),
    },
    {
      path: '/documents',
      element: (
        <DocumentsPage
          documents={documents}
          onAdd={() => startAdd('documents')}
          onOpen={(item) => openRecord('documents', item.id)}
        />
      ),
    },
    {
      path: '/tasks',
      element: (
        <TasksPage
          tasks={tasks}
          onToggle={toggleTask}
          onEdit={startEdit}
          onDelete={removeTask}
          onSkip={skipTask}
          onAdd={() => startAdd('tasks')}
          busyTaskIds={busyTaskIds}
          relatedRecordLabels={relatedRecordLabels}
          onOpenRelated={(reference) =>
            openRecord(reference.kind === 'recipe' ? 'recipes' : 'documents', reference.id)
          }
        />
      ),
    },
    { path: '/recipes/:id', element: detailPage },
    { path: '/documents/:id', element: detailPage },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
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
          top={online ? 0 : 38}
          px="md"
          py={10}
          bg="var(--app-header)"
          style={{ zIndex: 20 }}
        >
          <Group justify="space-between" wrap="nowrap" mih={44}>
            <Group gap="xs" wrap="nowrap">
              {route.id && (
                <HeaderButton
                  icon={<ArrowLeft size={20} />}
                  label="返回列表"
                  onClick={() => setTab(tab)}
                />
              )}
              <Stack gap={1}>
                <Text c={dark ? 'green.3' : 'green.7'} size="xs" fw={700}>
                  {route.id
                    ? titles[tab]
                    : tab === 'home'
                      ? new Intl.DateTimeFormat('zh-CN', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        }).format(new Date())
                      : '生活手册'}
                </Text>
                <Title order={1} size={24} lh={1.15}>
                  {route.id ? (tab === 'recipes' ? '菜谱详情' : '资料详情') : titles[tab]}
                </Title>
              </Stack>
            </Group>
            <Group gap={2} wrap="nowrap">
              {route.id ? (
                detailItem && (
                  <>
                    <HeaderButton
                      icon={<Pencil size={17} />}
                      label="编辑记录"
                      onClick={() => startEdit(detailItem)}
                    />
                    <HeaderButton
                      icon={<Trash2 size={17} />}
                      label="删除记录"
                      color="red"
                      onClick={() => removeRecord(detailItem)}
                    />
                  </>
                )
              ) : (
                <>
                  <HeaderButton
                    icon={
                      dark ? (
                        <Sun className="theme-toggle-icon" size={19} />
                      ) : (
                        <Moon className="theme-toggle-icon" size={19} />
                      )
                    }
                    label={dark ? '开灯' : '关灯'}
                    color={dark ? 'yellow' : 'gray'}
                    onClick={() => setColorScheme(dark ? 'light' : 'dark')}
                  />
                  <HeaderButton
                    icon={<Settings size={19} />}
                    label="打开设置"
                    onClick={() => setPanel('settings')}
                  />
                </>
              )}
            </Group>
          </Group>
        </Box>
        <Box px="sm" pt="sm" pb={108}>
          {loading && (
            <Text ta="center" c="dimmed" py="xl">
              正在整理你的记录…
            </Text>
          )}
          {!loading && page}
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
          open={editor?.kind === 'note'}
          initialNote={editor?.kind === 'note' ? editor.item : undefined}
          onClose={closeEditor}
          onSave={saveNote}
        />
        <AddRecordSheet
          initialItem={editor?.kind === 'record' ? editor.item : undefined}
          open={editor?.kind === 'record'}
          mode={editor?.kind === 'record' ? editor.mode : 'tasks'}
          onClose={closeEditor}
          onSave={saveItem}
          relatedRecordOptions={relatedRecordOptions}
          defaultRelatedRecord={editor?.kind === 'record' ? editor.relatedRecord : undefined}
        />
        <CookingRecordSheet
          open={editor?.kind === 'cooking'}
          recipeTitle={editor?.kind === 'cooking' ? editor.recipe.title : ''}
          initialRecord={editor?.kind === 'cooking' ? editor.record : undefined}
          onClose={closeEditor}
          onSave={addCookingRecord}
        />
        <SettingsSheet
          open={panel === 'settings'}
          notificationsEnabled={notificationsEnabled}
          onClose={() => setPanel(null)}
          onToggleNotifications={toggleNotifications}
          onExport={downloadBackup}
          onImport={restoreBackup}
          installAvailable={!!installPrompt}
          onInstall={installApp}
          trashCount={trashItems.length}
          onOpenTrash={() => void openTrash()}
          lastBackupAt={lastBackupAt}
          onOpenOrganize={() => setPanel('organize')}
          onClearData={confirmClearAllData}
        />
        <OrganizeSheet
          open={panel === 'organize'}
          data={{ recipes, documents, tasks, notes }}
          onClose={() => setPanel(null)}
          onApply={organizeItems}
        />
        <TrashSheet
          open={panel === 'trash'}
          entries={trashItems}
          onClose={() => setPanel(null)}
          onRestore={(entry) => void restoreFromTrash(entry)}
          onDelete={permanentlyRemoveFromTrash}
          onEmpty={confirmEmptyTrash}
        />
        <WelcomeGuide open={onboardingOpen} onComplete={completeOnboarding} />
      </Paper>
    </Box>
  );
}
