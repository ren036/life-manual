import type { RelatedRecordRef } from './types';

export function relatedRecordKey(reference: RelatedRecordRef): string {
  return `${reference.kind}:${reference.id}`;
}

export function parseRelatedRecordKey(value?: string | null): RelatedRecordRef | undefined {
  if (!value) return undefined;
  const separator = value.indexOf(':');
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if ((kind !== 'recipe' && kind !== 'document') || !id) return undefined;
  return { kind, id };
}
