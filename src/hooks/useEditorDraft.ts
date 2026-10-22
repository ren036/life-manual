import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { loadEditorDraft, saveEditorDraft } from '../storage/database';

interface StoredDraft<T> {
  revision: string;
  value: T;
}

export function useEditorDraft<T extends object>(key: string, initialValue: T, source?: unknown) {
  const initial = useRef(initialValue).current;
  const revision = useRef(JSON.stringify(source ?? null)).current;
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [restored, setRestored] = useState(false);
  const finished = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const initialSignature = useRef(JSON.stringify(initial)).current;
  const latest = useRef({ value, ready });
  latest.current = { value, ready };
  const dirty = JSON.stringify(value) !== initialSignature;

  useEffect(() => {
    let active = true;
    void loadEditorDraft<StoredDraft<T>>(key)
      .then((draft) => {
        if (!active) return;
        if (draft?.revision === revision) {
          setValue(draft.value);
          setRestored(true);
          setStatus('saved');
        }
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setStatus('error');
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [key, revision]);

  async function persist(snapshot: T) {
    await saveEditorDraft(
      key,
      JSON.stringify(snapshot) === initialSignature ? undefined : { revision, value: snapshot },
    );
  }

  useEffect(() => {
    if (!ready || finished.current) return;
    setStatus(dirty ? 'saving' : 'idle');
    let active = true;
    saveTimer.current = window.setTimeout(() => {
      void persist(value)
        .then(() => {
          if (active) setStatus(dirty ? 'saved' : 'idle');
        })
        .catch(() => {
          if (active) setStatus('error');
        });
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(saveTimer.current);
    };
  }, [value, ready]);

  useEffect(() => {
    const flush = () => {
      if (latest.current.ready && !finished.current)
        void persist(latest.current.value).catch(() => {});
    };
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, [key]);

  function setField<K extends keyof T>(field: K, next: SetStateAction<T[K]>) {
    setValue((current) => ({
      ...current,
      [field]:
        typeof next === 'function' ? (next as (previous: T[K]) => T[K])(current[field]) : next,
    }));
  }

  async function close(onClose: () => void) {
    try {
      await persist(latest.current.value);
      onClose();
    } catch {
      setStatus('error');
    }
  }

  async function complete() {
    finished.current = true;
    window.clearTimeout(saveTimer.current);
    // A successful record save must not be reported as failed if draft cleanup fails.
    await saveEditorDraft(key, undefined).catch(() => {});
  }

  async function discard() {
    window.clearTimeout(saveTimer.current);
    await saveEditorDraft(key, undefined);
    setValue(initial);
    setRestored(false);
    setStatus('idle');
  }

  return { value, setField, ready, status, restored, dirty, close, complete, discard };
}
