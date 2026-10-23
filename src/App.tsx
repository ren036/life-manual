import './mobile.css';
import {
  ActionIcon,
  Button,
  Group,
  Text,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, BookOpen, Pencil, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { matchPath, Navigate, useLocation, useNavigate, useRoutes } from 'react-router';
import { AddRecordSheet } from './components/AddRecordSheet';
import { BottomNav } from './components/BottomNav';
import { CookingRecordSheet } from './components/CookingRecordSheet';
import { OrganizeSheet } from './components/OrganizeSheet';
import { NoteSheet } from './components/NoteSheet';
import { TrashSheet } from './components/TrashSheet';
import { WelcomeGuide } from './components/WelcomeGuide';
import { RecordActionsMenu } from './components/RecordActionsMenu';
import { useAppData } from './hooks/useAppData';
import { useBackup } from './hooks/useBackup';
import { useDeleteActions } from './hooks/useDeleteActions';
import { useEditor } from './hooks/useEditor';
import { rememberPageScroll, resetTaskView, usePageScroll } from './hooks/usePageState';
import { useReminders } from './hooks/useReminders';
import { useTaskActions } from './hooks/useTaskActions';
import { useTrash } from './hooks/useTrash';
import { useRecentRecords } from './hooks/useRecentRecords';
import { TodayPage } from './pages/TodayPage';
import { RecordsPage } from './pages/RecordsPage';
import { NoteDetailPage } from './pages/NoteDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { TasksPage } from './pages/TasksPage';
import { libraryRecords, type LibraryRecord } from './library';
import { relatedRecordKey } from './relatedRecords';
import { onAppUpdateAvailable } from './serviceWorker';
import type { AppTab } from './types';
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export default function App() {
  const { setColorScheme } = useMantineColorScheme();
  const dark = useComputedColorScheme('light') === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const detailMatch =
    matchPath('/recipes/:id', location.pathname) ?? matchPath('/documents/:id', location.pathname);
  const noteMatch = matchPath('/notes/:id', location.pathname);
  const isDetail = !!(detailMatch || noteMatch);
  const tab: AppTab =
    location.pathname === '/profile'
      ? 'profile'
      : location.pathname === '/tasks'
        ? 'tasks'
        : location.pathname === '/'
          ? 'home'
          : 'records';
  const setTab = (next: AppTab) => {
    rememberPageScroll(location.pathname + location.search);
    const target =
      next === 'home'
        ? '/'
        : next === 'recipes'
          ? '/records?type=recipe'
          : next === 'documents'
            ? '/records?type=document'
            : next === 'notes'
              ? '/records?type=note'
              : '/' + next;
    navigate(target);
  };
  const openRecord = (kind: 'recipes' | 'documents' | 'notes', id: string) => {
    rememberPageScroll(location.pathname + location.search);
    const path = '/' + kind + '/' + encodeURIComponent(id);
    if (path !== location.pathname)
      navigate(path, { state: { returnTo: location.pathname + location.search } });
  };
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
  const [panel, setPanel] = useState<'organize' | 'trash' | null>(null);
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
        color: 'blue',
        radius: 'lg',
        withBorder: true,
        withCloseButton: false,
        autoClose: false,
      });
    });
  }, []);

  usePageScroll(location.pathname + location.search, !loading);
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

  const recordData = { recipes, documents, notes };
  const records = useMemo(() => libraryRecords(recordData), [recipes, documents, notes]);
  const { recent, remember } = useRecentRecords(records);
  const detailItem = detailMatch?.params.id
    ? (location.pathname.startsWith('/recipes/') ? recipes : documents).find(
        (item) => item.id === detailMatch.params.id,
      )
    : undefined;
  const noteItem = noteMatch?.params.id
    ? notes.find((item) => item.id === noteMatch.params.id)
    : undefined;
  useEffect(() => {
    if (detailItem)
      remember(
        'ingredients' in detailItem
          ? { kind: 'recipe', item: detailItem }
          : { kind: 'document', item: detailItem },
      );
    else if (noteItem) remember({ kind: 'note', item: noteItem });
  }, [location.pathname, detailItem?.id, noteItem?.id]);
  const onOpenLibrary = (record: LibraryRecord) =>
    openRecord(
      record.kind === 'recipe' ? 'recipes' : record.kind === 'document' ? 'documents' : 'notes',
      record.item.id,
    );
  function addRecord(kind: string) {
    if (kind === 'document') startAdd('documents');
    else if (kind === 'recipe') startAdd('recipes');
    else startNote();
  }
  const relatedRecordLabels: Record<string, string> = Object.fromEntries([
    ...recipes.map((item) => [
      relatedRecordKey({ kind: 'recipe', id: item.id }),
      '菜谱 · ' + item.title,
    ]),
    ...documents.map((item) => [
      relatedRecordKey({ kind: 'document', id: item.id }),
      '资料 · ' + item.title,
    ]),
  ]);
  const relatedRecordOptions = Object.entries(relatedRecordLabels).map(([value, label]) => ({
    value,
    label,
  }));
  const settings = {
    notificationsEnabled,
    onToggleNotifications: toggleNotifications,
    onExport: downloadBackup,
    onImport: restoreBackup,
    installAvailable: !!installPrompt,
    onInstall: installApp,
    trashCount: trashItems.length,
    onOpenTrash: () => void openTrash(),
    lastBackupAt,
    onOpenOrganize: () => setPanel('organize'),
    onClearData: confirmClearAllData,
  };
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
        startAdd(
          'tasks',
          { kind: 'ingredients' in item ? 'recipe' : 'document', id: item.id },
          {
            title: 'ingredients' in item ? '准备做' + item.title : item.title + '到期提醒',
            dueDate: 'expiryDate' in item ? item.expiryDate : undefined,
          },
        )
      }
    />
  ) : (
    <div className="empty-library">
      <h2>没有找到这条记录</h2>
      <Button variant="light" onClick={() => setTab('records')}>
        回到记录
      </Button>
    </div>
  );
  const page = useRoutes([
    {
      path: '/',
      element: (
        <TodayPage
          records={records}
          recent={recent}
          tasks={tasks}
          documents={documents}
          busyTaskIds={busyTaskIds}
          onOpenRecord={onOpenLibrary}
          onEditTask={startEdit}
          onToggleTask={toggleTask}
          onAddNote={() => startNote()}
          onAddDocument={() => startAdd('documents')}
          onAddRecipe={() => startAdd('recipes')}
          onAddTask={() => startAdd('tasks')}
          onViewTasks={() => {
            resetTaskView();
            setTab('tasks');
          }}
          onViewRecords={() => setTab('records')}
          backupOverdue={backupOverdue}
          onBackup={downloadBackup}
        />
      ),
    },
    {
      path: '/records',
      element: <RecordsPage data={recordData} onOpen={onOpenLibrary} onAdd={addRecord} />,
    },
    {
      path: '/profile',
      element: (
        <ProfilePage
          recordCount={records.length}
          pendingCount={tasks.filter((task) => !task.completed).length}
          dark={dark}
          onToggleTheme={() => setColorScheme(dark ? 'light' : 'dark')}
          settings={settings}
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
    {
      path: '/notes/:id',
      element: noteItem ? (
        <NoteDetailPage note={noteItem} />
      ) : (
        <div className="empty-library">
          <h2>没有找到这条随记</h2>
          <Button onClick={() => setTab('records')}>回到记录</Button>
        </div>
      ),
    },
    { path: '/home', element: <Navigate to="/" replace /> },
    { path: '/notes', element: <Navigate to="/records?type=note" replace /> },
    { path: '/recipes', element: <Navigate to="/records?type=recipe" replace /> },
    { path: '/documents', element: <Navigate to="/records?type=document" replace /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
  const editDetail = () => {
    if (detailItem) startEdit(detailItem);
    else if (noteItem) startNote(noteItem);
  };
  const deleteDetail = () => {
    if (detailItem) void removeRecord(detailItem);
    else if (noteItem) {
      void removeNote(noteItem);
      setTab('notes');
    }
  };
  return (
    <div className="app-shell">
      <BottomNav active={tab} onChange={setTab} onAdd={() => startNote()} />
      <div className="app-workspace">
        <header className="app-topbar">
          {isDetail ? (
            <div className="detail-toolbar">
              <div>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size={44}
                  onClick={() => (location.state?.returnTo ? navigate(-1) : setTab('records'))}
                  aria-label="返回上一页"
                >
                  <ArrowLeft size={21} />
                </ActionIcon>
                <span>
                  {noteMatch ? '随记' : location.pathname.startsWith('/recipes/') ? '菜谱' : '资料'}
                </span>
              </div>
              <div>
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-sm"
                  leftSection={<Pencil size={15} />}
                  onClick={editDetail}
                  disabled={!detailItem && !noteItem}
                >
                  编辑
                </Button>
                <RecordActionsMenu
                  title={detailItem?.title || noteItem?.title || '记录'}
                  onEdit={editDetail}
                  onDelete={deleteDetail}
                  disabled={!detailItem && !noteItem}
                />
              </div>
            </div>
          ) : (
            <>
              <button type="button" className="topbar-brand" onClick={() => setTab('home')}>
                <BookOpen size={21} strokeWidth={1.6} />
                生活手册
              </button>
              <ActionIcon
                size={44}
                color="gray"
                variant="subtle"
                aria-label="搜索全部记录"
                onClick={() => navigate('/records?search=1')}
              >
                <Search size={21} strokeWidth={1.6} />
              </ActionIcon>
            </>
          )}
        </header>
        {!online && <div className="offline-notice">当前离线，仍可查看和编辑本机记录</div>}
        <main className={'app-page' + (isDetail ? ' detail-page' : '')} data-page={tab}>
          {loading ? (
            <Text ta="center" c="dimmed" py="xl">
              正在打开你的手册…
            </Text>
          ) : (
            page
          )}
        </main>
      </div>
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
        defaultTask={editor?.kind === 'record' ? editor.defaultTask : undefined}
      />
      <CookingRecordSheet
        open={editor?.kind === 'cooking'}
        recipeId={editor?.kind === 'cooking' ? editor.recipe.id : ''}
        recipeTitle={editor?.kind === 'cooking' ? editor.recipe.title : ''}
        initialRecord={editor?.kind === 'cooking' ? editor.record : undefined}
        onClose={closeEditor}
        onSave={addCookingRecord}
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
    </div>
  );
}
