import { useLocalStorage } from '@mantine/hooks';
import { libraryKey, type LibraryRecord } from '../library';
interface Visit {
  key: string;
  at: number;
}
export function useRecentRecords(records: LibraryRecord[]) {
  const [visits, setVisits] = useLocalStorage<Visit[]>({
    key: 'life-manual-recent-records',
    defaultValue: [],
    getInitialValueInEffect: false,
  });
  const recent = visits
    .flatMap((visit) => {
      const record = records.find((record) => libraryKey(record) === visit.key);
      return record ? [record] : [];
    })
    .slice(0, 4);
  function remember(record: LibraryRecord) {
    const key = libraryKey(record);
    setVisits((current) =>
      [{ key, at: Date.now() }, ...current.filter((visit) => visit.key !== key)].slice(0, 20),
    );
  }
  return { recent, remember };
}
