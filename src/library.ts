import { recordAttachments, recipeCover } from './attachments';
import type { AppData, DocumentItem, NoteEntry, Recipe } from './types';
export type RecordKind = 'document' | 'note' | 'recipe';
export type LibraryRecord =
  | { kind: 'document'; item: DocumentItem }
  | { kind: 'note'; item: NoteEntry }
  | { kind: 'recipe'; item: Recipe };
export const kindLabels: Record<RecordKind, string> = {
  document: '资料',
  note: '随记',
  recipe: '菜谱',
};
export function libraryRecords(
  data: Pick<AppData, 'documents' | 'notes' | 'recipes'>,
): LibraryRecord[] {
  return [
    ...data.documents.map((item) => ({ kind: 'document' as const, item })),
    ...data.notes.map((item) => ({ kind: 'note' as const, item })),
    ...data.recipes.map((item) => ({ kind: 'recipe' as const, item })),
  ];
}
export function libraryKey(record: LibraryRecord) {
  return record.kind + ':' + record.item.id;
}
export function recordText(record: LibraryRecord) {
  if (record.kind === 'note')
    return [record.item.title, record.item.content, record.item.mood].join(' ');
  if (record.kind === 'recipe')
    return [
      record.item.title,
      record.item.notes,
      record.item.category,
      ...record.item.ingredients,
      ...(record.item.tags || []),
    ].join(' ');
  return [
    record.item.title,
    record.item.description,
    record.item.category,
    record.item.ocrText,
    ...(record.item.tags || []),
  ].join(' ');
}
export function recordSummary(record: LibraryRecord) {
  if (record.kind === 'note') return record.item.content || '一段语音随记';
  if (record.kind === 'recipe')
    return record.item.ingredients.join('、') || record.item.notes || '还没有填写食材';
  return record.item.description || record.item.attachmentName || '还没有添加说明';
}
export function recordImage(record: LibraryRecord): string | undefined {
  if (record.kind === 'recipe') {
    const cover = recipeCover(record.item);
    return cover.available ? cover.id : undefined;
  }
  if (record.kind === 'document')
    return recordAttachments(record.item).find((file) => file.type.startsWith('image/'))?.id;
}
export function shortDate(value: number) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString())
    return (
      '今天 ' +
      new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date)
    );
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}),
  }).format(date);
}
