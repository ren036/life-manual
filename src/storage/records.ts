import { seedRecords } from '../data/seed';
import type { LifeRecord } from '../types';

const STORAGE_KEY = 'life-manual-records';

export function loadRecords(): LifeRecord[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedRecords;
  } catch {
    return seedRecords;
  }
}

export function saveRecords(records: LifeRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
