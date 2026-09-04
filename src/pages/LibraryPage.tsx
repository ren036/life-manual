import { Camera, FileText, Utensils, Wrench } from 'lucide-react';
import { RecordCard } from '../components/RecordCard';
import type { LifeRecord, RecordKind } from '../types';

const groups = [{ kind: '菜品', icon: Utensils }, { kind: '维修', icon: Wrench }, { kind: '文件', icon: FileText }, { kind: '图片', icon: Camera }] as const;

export function LibraryPage({ records, onOpen }: { records: LifeRecord[]; onOpen: (record: LifeRecord) => void }) {
  return <section><div className="stats">{groups.map(({ kind, icon: Icon }) => <div key={kind}><Icon /><strong>{records.filter((record) => record.kind === (kind as RecordKind)).length}</strong><span>{kind}</span></div>)}</div><div className="section-heading"><h2>全部</h2><span>{records.length} 条</span></div><div className="record-list">{records.map((record) => <RecordCard key={record.id} record={record} onOpen={onOpen} />)}</div></section>;
}
