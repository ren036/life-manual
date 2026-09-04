import { Plus, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AddRecordSheet } from './components/AddRecordSheet';
import { BottomNav } from './components/BottomNav';
import { DocumentsPage } from './pages/DocumentsPage';
import { HomePage } from './pages/HomePage';
import { RecipesPage } from './pages/RecipesPage';
import { TasksPage } from './pages/TasksPage';
import { insertDocument, insertRecipe, insertTask, loadAppData, openAttachment, updateTask } from './storage/database';
import type { AddMode, AppTab, DocumentItem, Recipe, TaskItem } from './types';

const pageTitles: Record<AppTab, string> = { home: '生活手册', recipes: '我的菜谱', documents: '资料库', tasks: '待办事项' };
type SavedItem = Recipe | DocumentItem | TaskItem;

export default function App() {
  const [tab, setTab] = useState<AppTab>('home');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('tasks');
  const [toast, setToast] = useState('');

  useEffect(() => { loadAppData().then((data) => { setRecipes(data.recipes); setDocuments(data.documents); setTasks(data.tasks); }).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2200); return () => window.clearTimeout(timer); }, [toast]);

  function startAdd(mode: AddMode) { setAddMode(mode); setSheetOpen(true); }
  async function saveItem(item: SavedItem, file?: File) {
    if (addMode === 'recipes') { await insertRecipe(item as Recipe, file); setRecipes((old) => [item as Recipe, ...old]); }
    else if (addMode === 'documents') { await insertDocument(item as DocumentItem, file); setDocuments((old) => [item as DocumentItem, ...old]); }
    else { await insertTask(item as TaskItem); setTasks((old) => [item as TaskItem, ...old]); }
    setSheetOpen(false); setTab(addMode); setToast('已经保存好了');
  }
  async function toggleTask(item: TaskItem) {
    const updated = { ...item, completed: !item.completed, completedAt: item.completed ? undefined : Date.now() };
    await updateTask(updated); setTasks((old) => old.map((task) => task.id === item.id ? updated : task));
  }
  async function openRecipe(item: Recipe) { if (item.hasFile && await openAttachment(item.id)) return; setToast(item.notes || item.ingredients.join('、') || '暂无更多说明'); }
  async function openDocument(item: DocumentItem) { if (item.hasFile && await openAttachment(item.id)) return; setToast(item.description || '这份资料还没有附件'); }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown) => void } }).modelContext;
    if (!context?.registerTool) return;
    context.registerTool({ name: 'create_task', title: '新建待办', description: '在生活手册中添加一件要做的事。', inputSchema: { type: 'object', properties: { title: { type: 'string' }, notes: { type: 'string' }, category: { type: 'string' } }, required: ['title'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, async execute(input: { title: string; notes?: string; category?: string }) { const item: TaskItem = { id: crypto.randomUUID(), title: input.title.trim(), notes: input.notes?.trim() || '', category: input.category?.trim() || '生活', priority: '普通', completed: false, createdAt: Date.now() }; await insertTask(item); setTasks((old) => [item, ...old]); return { id: item.id, status: 'created', title: item.title }; } });
  }, []);

  const floatingMode: AddMode = tab === 'home' ? 'tasks' : tab;
  return <main className="shell antialiased"><div className="app-frame"><header className="topbar"><div><span>我的生活</span><h1>{pageTitles[tab]}</h1></div><button className="icon-button" aria-label="设置" onClick={() => setToast('设置功能将在下一版加入')}><Settings /></button></header><div className="content-area">{loading && <p className="empty-state">正在整理你的记录…</p>}{!loading && tab === 'home' && <HomePage recipes={recipes} documents={documents} tasks={tasks} onNavigate={setTab} onAdd={startAdd} />}{!loading && tab === 'recipes' && <RecipesPage recipes={recipes} onOpen={openRecipe} />}{!loading && tab === 'documents' && <DocumentsPage documents={documents} onOpen={openDocument} />}{!loading && tab === 'tasks' && <TasksPage tasks={tasks} onToggle={toggleTask} />}</div>{tab !== 'home' && <button className="floating-add" onClick={() => startAdd(floatingMode)} aria-label="新增"><Plus /></button>}<BottomNav active={tab} onChange={setTab} />{toast && <div className="toast" aria-live="polite">{toast}</div>}</div><AddRecordSheet open={sheetOpen} mode={addMode} onClose={() => setSheetOpen(false)} onSave={saveItem} /></main>;
}
