import { FilePlus2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AddMode, DocumentItem, Recipe, TaskItem, TaskPriority } from '../types';

type SavedItem = Recipe | DocumentItem | TaskItem;
interface Props { open: boolean; mode: AddMode; onClose: () => void; onSave: (item: SavedItem, file?: File) => Promise<void> }

const labels: Record<AddMode, { title: string; subtitle: string }> = {
  recipes: { title: '记一道菜', subtitle: '只收录自己真正做过的味道' },
  documents: { title: '保存资料', subtitle: '图片和文件都可以收进来' },
  tasks: { title: '新建待办', subtitle: '把要做的事从脑子里拿出来' },
};

export function AddRecordSheet({ open, mode, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('普通');
  const [important, setImportant] = useState(false);
  const [file, setFile] = useState<File>();

  useEffect(() => { setTitle(''); setDetail(''); setCategory(''); setIngredients(''); setDueDate(''); setPriority('普通'); setImportant(false); setFile(undefined); }, [mode, open]);
  if (!open) return null;

  async function submit() {
    if (!title.trim()) return;
    const base = { id: crypto.randomUUID(), title: title.trim(), createdAt: Date.now() };
    let item: SavedItem;
    if (mode === 'recipes') item = { ...base, notes: detail.trim(), ingredients: ingredients.split(/[，,、\s]+/).filter(Boolean), category: category.trim() || '家常菜', date: '刚刚', attachmentName: file?.name, hasFile: Boolean(file) };
    else if (mode === 'documents') item = { ...base, description: detail.trim(), category: category.trim() || '其他', important, date: '刚刚', attachmentName: file?.name, hasFile: Boolean(file), isImage: file?.type.startsWith('image/') };
    else item = { ...base, notes: detail.trim(), category: category.trim() || '生活', dueDate: dueDate || undefined, priority, completed: false };
    await onSave(item, file);
  }

  const meta = labels[mode];
  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="add-sheet" aria-modal="true" role="dialog"><div className="sheet-handle" /><header><div><h2>{meta.title}</h2><p>{meta.subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button></header><div className="record-form">
    <label>{mode === 'recipes' ? '菜名' : mode === 'documents' ? '资料名称' : '要做什么'}<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === 'recipes' ? '例如：番茄炒蛋' : mode === 'documents' ? '例如：冰箱电子发票' : '例如：预约洗牙'} /></label>
    {mode === 'recipes' && <label>食材<input value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="用逗号分开，例如：鸡蛋，番茄" /></label>}
    <label>分类<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={mode === 'recipes' ? '家常菜、早餐、汤…' : mode === 'documents' ? '证件资料、医疗健康、发票与保修…' : '家庭、采购、工作…'} /></label>
    {mode === 'tasks' && <><label>截止日期（可选）<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label><fieldset className="choice-field"><legend>优先级</legend><div className="segmented">{(['普通', '重要', '紧急'] as TaskPriority[]).map((value) => <button type="button" key={value} aria-pressed={priority === value} onClick={() => setPriority(value)}>{value}</button>)}</div></fieldset></>}
    <label>{mode === 'tasks' ? '备注' : mode === 'recipes' ? '做法和心得' : '说明'}<textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="可以先简单记几句，以后再补充" /></label>
    {mode !== 'tasks' && <label className="file-picker"><FilePlus2 />{file ? file.name : mode === 'recipes' ? '添加成品照片' : '选择图片或文件'}<input type="file" accept={mode === 'recipes' ? 'image/*' : 'image/*,.pdf,.doc,.docx,.xls,.xlsx'} onChange={(e) => setFile(e.target.files?.[0])} /></label>}
    {mode === 'documents' && <label className="check-row"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />标记为重要资料</label>}
    <button className="primary-button" disabled={!title.trim()} onClick={submit}>保存</button>
  </div></section></div>;
}
