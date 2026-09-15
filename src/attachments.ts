import type { Attachment, DocumentItem, Recipe } from './types';

export function recordAttachments(item: Recipe | DocumentItem): Attachment[] {
  return (
    item.attachments ??
    (item.hasFile
      ? [
          {
            id: item.id,
            name: item.attachmentName || '附件',
            type: 'ingredients' in item || item.isImage ? 'image/*' : '',
          },
        ]
      : [])
  );
}

export function attachmentIds(item: Recipe | DocumentItem): string[] {
  return [
    ...recordAttachments(item),
    ...(item.steps || []).flatMap((step) => step.attachments),
    ...('ingredients' in item
      ? (item.cookingRecords || []).flatMap((record) => record.attachments)
      : []),
  ].map((file) => file.id);
}

export function recipeCover(item: Recipe): { id: string; available: boolean } {
  const latestPhoto = [...(item.cookingRecords || [])]
    .sort((a, b) => b.createdAt - a.createdAt)[0]
    ?.attachments.find((attachment) => attachment.type.startsWith('image/'));
  return {
    id: latestPhoto?.id || item.attachments?.[0]?.id || item.id,
    available: !!latestPhoto || !!item.hasFile,
  };
}
