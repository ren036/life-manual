import { useEffect, useState } from 'react';
import { bulkUpdateItems, loadAppData, loadTrash } from '../storage/database';
import { errorToast, toast } from '../toast';
import type { AddMode, AppData, TrashEntry } from '../types';

const ONBOARDING_KEY = 'life-manual-onboarding-v1';
type Data = AppData & { trashItems: TrashEntry[] };

export function useAppData() {
  const [data, setData] = useState<Data>({
    recipes: [],
    documents: [],
    tasks: [],
    notes: [],
    trashItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== 'done',
  );

  async function refresh() {
    const [records, trashItems] = await Promise.all([loadAppData(), loadTrash()]);
    setData({ ...records, trashItems });
  }

  useEffect(() => {
    if (onboardingOpen) {
      setLoading(false);
      return;
    }
    void refresh()
      .catch(() => errorToast('读取记录失败，请重试'))
      .finally(() => setLoading(false));
  }, []);

  async function completeOnboarding() {
    setLoading(true);
    try {
      await refresh();
      localStorage.setItem(ONBOARDING_KEY, 'done');
      setOnboardingOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function organizeItems(
    mode: AddMode,
    ids: string[],
    category?: string,
    tags: string[] = [],
  ) {
    const selected = new Set(ids);
    const updated = data[mode]
      .filter((item) => selected.has(item.id))
      .map((item) => ({
        ...item,
        category: category || item.category,
        tags: [...new Set([...(item.tags || []), ...tags])].slice(0, 12),
      }));
    await bulkUpdateItems(mode, updated);
    await refresh();
    toast(`已整理 ${ids.length} 项内容`);
  }

  return { ...data, loading, onboardingOpen, refresh, completeOnboarding, organizeItems };
}

export type AppStore = ReturnType<typeof useAppData>;
