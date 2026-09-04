import { Plus, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AddRecordSheet } from './components/AddRecordSheet';
import { BottomNav } from './components/BottomNav';
import { FoodPage } from './pages/FoodPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { SearchPage } from './pages/SearchPage';
import { insertRecord, loadRecords, openAttachment } from './storage/database';
import type { AppTab, LifeRecord, RecordKind } from './types';

const pageTitles: Record<AppTab, string> = { home: '生活手册', search: '搜索', food: '今天做什么', library: '全部记录' };


export default function App() {
  const [tab, setTab] = useState<AppTab>('home');
  const [records, setRecords] = useState<LifeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [initialKind, setInitialKind] = useState<RecordKind>('通用');
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadRecords().then(setRecords).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function startAdd(kind: RecordKind = '通用') {
    setInitialKind(kind);
    setSheetOpen(true);
  }

  async function addRecord(record: LifeRecord, file?: File) {
    await insertRecord(record, file);
    setRecords((current) => [record, ...current]);
    setSheetOpen(false);
    setTab('home');
    setToast('记录已保存到这台设备');
  }

  async function handleOpen(record: LifeRecord) {
    if (record.hasFile && await openAttachment(record.id)) return;
    setToast(record.detail);
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown) => void } }).modelContext;
    if (!context?.registerTool) return;
    context.registerTool({
      name: 'create_life_record',
      title: '新建生活记录',
      description: '在生活手册中创建一条新的文字记录。',
      inputSchema: {
        type: 'object',
        properties: { kind: { type: 'string', enum: ['通用', '菜品', '维修', '图片', '文件'] }, title: { type: 'string' }, detail: { type: 'string' } },
        required: ['kind', 'title', 'detail'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: { kind: RecordKind; title: string; detail: string }) {
        if (!input?.title?.trim()) throw new Error('标题不能为空');
        const record: LifeRecord = { id: crypto.randomUUID(), kind: input.kind, title: input.title.trim(), detail: input.detail.trim() || '暂未填写说明', date: '刚刚', createdAt: Date.now() };
        await insertRecord(record);
        setRecords((current) => [record, ...current]);
        setTab('home');
        return { id: record.id, status: 'created', title: record.title };
      },
    });
  }, []);

  return (
    <main className="shell">
      <div className="app-frame">
        <header className="topbar"><div><span>我的生活</span><h1>{pageTitles[tab]}</h1></div><button className="icon-button" aria-label="设置"><Settings /></button></header>
        <div className="content-area">
          {loading && <p className="empty-state">正在读取本机记录…</p>}
          {!loading && tab === 'home' && <HomePage records={records} onOpen={handleOpen} onNavigate={setTab} onAdd={startAdd} />}
          {!loading && tab === 'search' && <SearchPage records={records} onOpen={handleOpen} />}
          {!loading && tab === 'food' && <FoodPage records={records} />}
          {!loading && tab === 'library' && <LibraryPage records={records} onOpen={handleOpen} />}
        </div>
        <button className="floating-add" onClick={() => startAdd()} aria-label="新建记录"><Plus /></button>
        <BottomNav active={tab} onChange={setTab} />
        {toast && <div className="toast" aria-live="polite">{toast}</div>}
      </div>
      <AddRecordSheet open={sheetOpen} initialKind={initialKind} onClose={() => setSheetOpen(false)} onSave={addRecord} />
    </main>
  );
}
