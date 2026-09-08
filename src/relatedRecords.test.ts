import { describe, expect, it } from 'vitest';
import { parseRelatedRecordKey, relatedRecordKey } from './relatedRecords';

describe('记录关联键', () => {
  it('可以往返转换菜谱和资料引用', () => {
    const reference = { kind: 'document' as const, id: 'document-123' };
    expect(parseRelatedRecordKey(relatedRecordKey(reference))).toEqual(reference);
  });

  it('拒绝无效引用', () => {
    expect(parseRelatedRecordKey('task:123')).toBeUndefined();
    expect(parseRelatedRecordKey('recipe:')).toBeUndefined();
  });
});
