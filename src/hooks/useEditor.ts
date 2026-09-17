import { useState } from 'react';
import {
  insertDocument,
  insertNote,
  insertRecipe,
  insertTask,
  updateRecord,
  updateNote,
  updateTask,
} from '../storage/database';
import { toast } from '../toast';
import type {
  AddMode,
  AppTab,
  CookingRecord,
  DocumentItem,
  NoteEntry,
  PendingAttachment,
  Recipe,
  RelatedRecordRef,
  TaskItem,
} from '../types';
import type { AppStore } from './useAppData';

type SavedItem = Recipe | DocumentItem | TaskItem;
export type Editor =
  | { kind: 'record'; mode: AddMode; item?: SavedItem; relatedRecord?: RelatedRecordRef }
  | { kind: 'note'; item?: NoteEntry }
  | { kind: 'cooking'; recipe: Recipe; record?: CookingRecord };

export function useEditor(
  { refresh }: AppStore,
  setTab: (tab: AppTab) => void,
  openRecord: (kind: 'recipes' | 'documents', id: string) => void,
) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const closeEditor = () => setEditor(null);
  const startAdd = (mode: AddMode, relatedRecord?: RelatedRecordRef) =>
    setEditor({ kind: 'record', mode, relatedRecord });
  const startNote = (item?: NoteEntry) => setEditor({ kind: 'note', item });
  const startCooking = (recipe: Recipe, record?: CookingRecord) =>
    setEditor({ kind: 'cooking', recipe, record });
  function startEdit(item: SavedItem) {
    const mode = 'ingredients' in item ? 'recipes' : 'description' in item ? 'documents' : 'tasks';
    setEditor({ kind: 'record', mode, item });
  }

  async function saveItem(item: SavedItem, files: PendingAttachment[]) {
    if (editor?.kind !== 'record') return;
    const { item: previous, mode } = editor;
    if (previous) {
      if ('completed' in item && 'completed' in previous) await updateTask(item);
      else if (!('completed' in item) && !('completed' in previous))
        await updateRecord(item, previous, files);
      else return;
      await refresh();
      if (!('completed' in item))
        openRecord('ingredients' in item ? 'recipes' : 'documents', item.id);
      toast('修改已保存');
    } else {
      if (mode === 'recipes') await insertRecipe(item as Recipe, files);
      else if (mode === 'documents') await insertDocument(item as DocumentItem, files);
      else await insertTask(item as TaskItem);
      await refresh();
      setTab(mode);
      toast('已经保存好了');
    }
    closeEditor();
  }

  async function saveNote(note: NoteEntry, audio?: PendingAttachment) {
    if (editor?.kind !== 'note') return;
    if (editor.item) await updateNote(note, editor.item, audio);
    else await insertNote(note, audio);
    await refresh();
    closeEditor();
    toast(editor.item ? '随记已更新' : '这一刻已经记下了');
  }

  async function toggleFavorite(item: Recipe) {
    const updated = { ...item, favorite: !item.favorite };
    await updateRecord(updated, item, []);
    await refresh();
    toast(updated.favorite ? '已收藏' : '已取消收藏');
  }

  async function addCookingRecord(record: CookingRecord, files: PendingAttachment[]) {
    if (editor?.kind !== 'cooking') return;
    const { recipe, record: previous } = editor;
    const updated: Recipe = {
      ...recipe,
      cookingRecords: previous
        ? (recipe.cookingRecords || []).map((item) => (item.id === previous.id ? record : item))
        : [...(recipe.cookingRecords || []), record],
    };
    await updateRecord(updated, recipe, files);
    await refresh();
    closeEditor();
    toast(previous ? '下厨记录已更新' : '这次下厨已经记录好了');
  }

  return {
    editor,
    closeEditor,
    startAdd,
    startEdit,
    startNote,
    startCooking,
    saveItem,
    saveNote,
    addCookingRecord,
    toggleFavorite,
  };
}
