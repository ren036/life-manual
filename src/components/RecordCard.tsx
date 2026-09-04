import { Camera, FileText, Mic, Utensils, Wrench } from 'lucide-react';
import type { LifeRecord, RecordKind } from '../types';

const icons = { 菜品: Utensils, 维修: Wrench, 文件: FileText, 图片: Camera, 通用: Mic } satisfies Record<RecordKind, typeof Camera>;

interface Props {
  record: LifeRecord;
  onOpen: (record: LifeRecord) => void;
}

export function RecordCard({ record, onOpen }: Props) {
  const Icon = icons[record.kind];
  return (
    <button className="record-card" onClick={() => onOpen(record)}>
      <span className="record-icon"><Icon aria-hidden="true" /></span>
      <span className="record-copy">
        <strong>{record.title}</strong>
        <span>{record.kind} · {record.attachmentName || record.detail}</span>
        <small>{record.date}</small>
      </span>
      <span className="record-arrow" aria-hidden="true">›</span>
    </button>
  );
}
