import { Bookmark, ChevronRight, FileText, Mic, NotebookPen, Utensils } from 'lucide-react';
import { AttachmentPreview } from './AttachmentPreview';
import { dueLabel, dueStatus } from '../dueDates';
import { kindLabels, recordImage, recordSummary, shortDate, type LibraryRecord } from '../library';
export function RecordRow({
  record,
  onOpen,
}: {
  record: LibraryRecord;
  onOpen: (record: LibraryRecord) => void;
}) {
  const image = recordImage(record);
  const Icon =
    record.kind === 'recipe' ? Utensils : record.kind === 'note' ? NotebookPen : FileText;
  const category = record.kind === 'note' ? record.item.mood : record.item.category;
  const saved =
    record.kind === 'recipe'
      ? record.item.favorite
      : record.kind === 'document'
        ? record.item.important
        : false;
  return (
    <button
      type="button"
      className={'record-row record-row--' + record.kind}
      onClick={() => onOpen(record)}
      aria-label={'打开' + kindLabels[record.kind] + '：' + record.item.title}
    >
      <span className={'record-thumbnail' + (image ? ' has-image' : '')}>
        {image ? (
          <AttachmentPreview id={image} enabled alt={record.item.title} />
        ) : (
          <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
        )}
      </span>
      <span className="record-copy">
        <span className="record-title">{record.item.title}</span>
        <span className="record-summary">{recordSummary(record)}</span>
        <span className="record-meta">
          <span>
            {kindLabels[record.kind]} · {category}
          </span>
          <span className="tiny-dot" aria-hidden="true" />
          {record.kind === 'document' && record.item.expiryDate ? (
            <span className={dueStatus(record.item.expiryDate) === 'overdue' ? 'text-danger' : ''}>
              {dueLabel(record.item.expiryDate)}
            </span>
          ) : (
            shortDate(record.item.createdAt)
          )}
          {record.kind === 'note' && record.item.audio && (
            <>
              <Mic size={12} aria-hidden="true" />
              语音
            </>
          )}
          {saved && (
            <Bookmark
              size={12}
              fill="currentColor"
              role="img"
              aria-label={record.kind === 'recipe' ? '已收藏' : '重要资料'}
            />
          )}
        </span>
      </span>
      <ChevronRight className="record-chevron" size={15} aria-hidden="true" />
    </button>
  );
}
