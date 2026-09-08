import { describe, expect, it } from 'vitest';
import { isBackupOverdue, isTrashExpired, trashDaysRemaining } from './dataSafety';

const day = 86400000;
const now = new Date('2026-09-08T12:00:00Z').getTime();

describe('数据安全时间规则', () => {
  it('备份满 30 天后提醒', () => {
    expect(isBackupOverdue(now - 29 * day, now)).toBe(false);
    expect(isBackupOverdue(now - 30 * day, now)).toBe(true);
  });

  it('回收站保留 30 天', () => {
    expect(trashDaysRemaining(now - 2 * day, now)).toBe(28);
    expect(isTrashExpired(now - 29 * day, now)).toBe(false);
    expect(isTrashExpired(now - 30 * day, now)).toBe(true);
  });
});
