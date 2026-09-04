import { FilePlus2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ingredients } from '../data/seed';
import type { LifeRecord, RecordKind } from '../types';

interface Props {
  open: boolean;
  initialKind: RecordKind;
  onClose: () => void;
  onSave: (record: LifeRecord, file?: File) => Promise<void>;
}

const kinds: RecordKind[] = ['通用', '菜品', '维修', '图片', '文件'];

export function AddRecordSheet({ open, initialKind, onClose, onSave }: Props) {
  const [kind, setKind] = useState(initialKind);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [file, setFile] = useState<File>();

  useEffect(() => setKind(initialKind), [initialKind]);
  if (!open) return null;

  async function submit() {
    if (!title.trim()) return;
    const record: LifeRecord = {
      id: crypto.randomUUID(), kind, title: title.trim(), detail: detail.trim() || '暂未填写说明', date: '刚刚', createdAt: Date.now(),
      attachmentName: file?.name, hasFile: Boolean(file),
      ingredients: kind === '菜品' ? detail.split(/[，,、\s]+/).filter((item) => ingredients.includes(item)) : undefined,
    };
    await onSave(record, file);
    setTitle(''); setDetail(''); setFile(undefined);
  }

  return (
    <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="add-sheet" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <div className="sheet-handle" />
        <header><div><h2 id="add-title">新建记录</h2><p>先快速保存，以后随时补充。</p></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button></header>
        <div className="kind-picker">{kinds.map((item) => <button key={item} aria-pressed={kind === item} onClick={() => setKind(item)}>{item}</button>)}</div>
        <div className="record-form">
          <label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="给这条记录起个名字" /></label>
          <label>{kind === '菜品' ? '食材和心得' : '说明'}<textarea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={kind === '菜品' ? '例如：鸡蛋、番茄。这次少放糖。' : '记录步骤、型号、位置或注意事项'} /></label>
          <label className="file-picker"><FilePlus2 /><span>{file?.name || '添加图片或文件'}</span><input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0])} /></label>
          <button className="primary-button" disabled={!title.trim()} onClick={submit}>保存记录</button>
        </div>
      </section>
    </div>
  );
}
