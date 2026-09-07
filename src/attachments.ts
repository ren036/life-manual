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
  ].map((file) => file.id);
}
