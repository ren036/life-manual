import { Camera, Mic, Search, Utensils } from 'lucide-react';
import { RecordCard } from '../components/RecordCard';
import type { AppTab, LifeRecord, RecordKind } from '../types';

interface Props { records: LifeRecord[]; onOpen: (record: LifeRecord) => void; onNavigate: (tab: AppTab) => void; onAdd: (kind: RecordKind) => void }

export function HomePage({ records, onOpen, onNavigate, onAdd }: Props) {
  return <section><div className="quick-grid">
    <button onClick={() => onAdd('图片')}><Camera /><strong>拍照记录</strong></button>
    <button onClick={() => onNavigate('food')}><Utensils /><strong>现有食材找菜</strong></button>
    <button onClick={() => onAdd('通用')}><Mic /><strong>说一句记下来</strong></button>
    <button onClick={() => onNavigate('search')}><Search /><strong>查旧记录</strong></button>
  </div><div className="section-heading"><h2>最近记录</h2><button onClick={() => onNavigate('library')}>查看全部</button></div><div className="record-list">{records.slice(0, 4).map((record) => <RecordCard key={record.id} record={record} onOpen={onOpen} />)}</div></section>;
}
