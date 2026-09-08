export const RETENTION_DAYS = 30;
export const BACKUP_REMINDER_DAYS = 30;

const DAY_MS = 86400000;

export function isBackupOverdue(reference: number, now = Date.now()): boolean {
  return now - reference >= BACKUP_REMINDER_DAYS * DAY_MS;
}

export function trashDaysRemaining(deletedAt: number, now = Date.now()): number {
  return Math.max(0, RETENTION_DAYS - Math.floor((now - deletedAt) / DAY_MS));
}

export function isTrashExpired(deletedAt: number, now = Date.now()): boolean {
  return now - deletedAt >= RETENTION_DAYS * DAY_MS;
}
