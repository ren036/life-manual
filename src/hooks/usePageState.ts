import { useSessionStorage } from '@mantine/hooks';
import { useLayoutEffect } from 'react';

export function usePageState<T>(key: string, defaultValue: T) {
  return useSessionStorage<T>({
    key: 'life-manual-view:' + key,
    defaultValue,
    getInitialValueInEffect: false,
  });
}

const scrollPositions = new Map<string, number>();
export function rememberPageScroll(pathname: string) {
  scrollPositions.set(pathname, window.scrollY);
}
export function usePageScroll(pathname: string, ready: boolean) {
  useLayoutEffect(() => {
    if (!ready) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const top = scrollPositions.get(pathname) || 0;
    window.scrollTo(0, top);
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, top));
    const remember = () => rememberPageScroll(pathname);
    window.addEventListener('scroll', remember, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', remember);
      window.history.scrollRestoration = previous;
    };
  }, [pathname, ready]);
}

export function resetTaskView() {
  for (const [key, value] of [
    ['tasks:view', '进行中'],
    ['tasks:filter', '全部'],
    ['tasks:query', ''],
  ]) {
    const storageKey = 'life-manual-view:' + key;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* In-memory controls still update when storage is unavailable. */
    }
    window.dispatchEvent(
      new CustomEvent('mantine-session-storage', { detail: { key: storageKey, value } }),
    );
  }
}
