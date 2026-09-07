import {
  ActionIcon,
  Button,
  Checkbox,
  Drawer,
  Fieldset,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { recordAttachments } from '../attachments';
import { AttachmentPicker } from './AttachmentPicker';
import type {
  AddMode,
  Attachment,
  DocumentItem,
  DraftAttachment,
  PendingAttachment,
  Recipe,
  TaskItem,
  TaskPriority,
  TaskRepeat,
} from '../types';

type SavedItem = Recipe | DocumentItem | TaskItem;
interface Props {
  open: boolean;
  mode: AddMode;
  initialItem?: SavedItem;
  onClose: () => void;
  onSave: (item: SavedItem, files: PendingAttachment[]) => Promise<void>;
}
interface DraftStep {
  id: string;
  text: string;
  attachments: DraftAttachment[];
}
const metadata = ({ id, name, type }: DraftAttachment): Attachment => ({ id, name, type });
const labels: Record<AddMode, string> = {
  recipes: '记一道菜',
  documents: '保存资料',
  tasks: '新建待办',
};

export function AddRecordSheet({ open, mode, initialItem, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [tags, setTags] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('普通');
  const [repeat, setRepeat] = useState<TaskRepeat>('不重复');
  const [important, setImportant] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [files, setFiles] = useState<DraftAttachment[]>([]);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  useEffect(() => {
    setTitle(initialItem?.title || '');
    setDetail(
      initialItem
        ? 'ingredients' in initialItem
          ? initialItem.notes
          : 'description' in initialItem
            ? initialItem.description
            : initialItem.notes
        : '',
    );
    setCategory(initialItem?.category || '');
    setIngredients(
      initialItem && 'ingredients' in initialItem ? initialItem.ingredients.join('，') : '',
    );
    setTags(
      initialItem && !('completed' in initialItem) ? (initialItem.tags || []).join('，') : '',
    );
    setDueDate(initialItem && 'completed' in initialItem ? initialItem.dueDate || '' : '');
    setExpiryDate(initialItem && 'description' in initialItem ? initialItem.expiryDate || '' : '');
    setPriority(initialItem && 'completed' in initialItem ? initialItem.priority : '普通');
    setRepeat(
      initialItem && 'completed' in initialItem ? initialItem.repeat || '不重复' : '不重复',
    );
    setImportant(initialItem && 'important' in initialItem ? initialItem.important : false);
    setFavorite(initialItem && 'ingredients' in initialItem ? !!initialItem.favorite : false);
    setFiles(initialItem && !('completed' in initialItem) ? recordAttachments(initialItem) : []);
    setSteps(
      initialItem && !('completed' in initialItem)
        ? initialItem.steps?.map((step) => ({ ...step, attachments: [...step.attachments] })) || []
        : [],
    );
    setError('');
  }, [mode, open, initialItem]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  if (!open) return null;
  function moveStep(index: number, direction: number) {
    setSteps((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }
  function moveAttachmentToStep(attachmentId: string, stepId?: string) {
    const attachment = files.find((file) => file.id === attachmentId);
    if (!attachment || (stepId && !steps.some((step) => step.id === stepId))) return;
    const destinationId = stepId || crypto.randomUUID();
    setSteps((current) =>
      stepId
        ? current.map((step) =>
            step.id === stepId ? { ...step, attachments: [...step.attachments, attachment] } : step,
          )
        : [...current, { id: destinationId, text: '', attachments: [attachment] }],
    );
    setFiles((current) => current.filter((file) => file.id !== attachmentId));
  }
  function returnAttachment(stepId: string, attachmentId: string) {
    const attachment = steps
      .find((step) => step.id === stepId)
      ?.attachments.find((file) => file.id === attachmentId);
    if (!attachment) return;
    setFiles((current) => [...current, attachment]);
    setSteps((current) =>
      current.map((step) =>
        step.id === stepId
          ? { ...step, attachments: step.attachments.filter((file) => file.id !== attachmentId) }
          : step,
      ),
    );
  }
  async function submit() {
    if (!title.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const base = {
        id: initialItem?.id || crypto.randomUUID(),
        title: title.trim(),
        createdAt: initialItem?.createdAt ?? Date.now(),
      };
      const keptSteps = steps.filter((step) => step.text.trim() || step.attachments.length);
      const content = {
        tags: tags
          .split(/[，,、\s]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 12),
        attachments: files.map(metadata),
        steps: keptSteps.map((step) => ({
          id: step.id,
          text: step.text.trim(),
          attachments: step.attachments.map(metadata),
        })),
        attachmentName: files[0]?.name,
        hasFile: files.length > 0,
      };
      let item: SavedItem;
      if (mode === 'recipes')
        item = {
          ...base,
          ...content,
          notes: detail.trim(),
          ingredients: ingredients.split(/[，,、\s]+/).filter(Boolean),
          category: category.trim() || '家常菜',
          favorite,
          date: initialItem && !('completed' in initialItem) ? initialItem.date : '刚刚',
        };
      else if (mode === 'documents')
        item = {
          ...base,
          ...content,
          description: detail.trim(),
          category: category.trim() || '其他',
          important,
          expiryDate: expiryDate || undefined,
          date: initialItem && !('completed' in initialItem) ? initialItem.date : '刚刚',
          isImage: files[0]?.type.startsWith('image/'),
        };
      else
        item = {
          ...base,
          notes: detail.trim(),
          category: category.trim() || '生活',
          dueDate: dueDate || undefined,
          priority,
          repeat: repeat === '不重复' ? undefined : repeat,
          completed: initialItem && 'completed' in initialItem ? initialItem.completed : false,
          completedAt:
            initialItem && 'completed' in initialItem ? initialItem.completedAt : undefined,
        };
      const newFiles = [...files, ...keptSteps.flatMap((step) => step.attachments)].filter(
        (attachment): attachment is PendingAttachment => !!attachment.file,
      );
      await onSave(item, mode === 'tasks' ? [] : newFiles);
    } catch {
      setError('保存失败，内容已保留。请检查设备存储空间后重试。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const close = () => {
    if (!savingRef.current) onClose();
  };
  return (
    <Drawer
      opened={open}
      onClose={close}
      position="bottom"
      size="92vh"
      radius="xl"
      title={
        <Stack gap={0}>
          <Title order={3} id="add-title">
            {initialItem
              ? mode === 'recipes'
                ? '编辑菜谱'
                : mode === 'documents'
                  ? '编辑资料'
                  : '编辑待办'
              : labels[mode]}
          </Title>
          <Text c="dimmed" size="xs">
            {mode === 'tasks' ? '把要做的事从脑子里拿出来' : '用图片和步骤，把细节记清楚'}
          </Text>
        </Stack>
      }
      closeButtonProps={{ disabled: saving, 'aria-label': '关闭' }}
      overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Fieldset disabled={saving} variant="unstyled">
          <Stack gap="md">
            <TextInput
              autoFocus
              required
              label={mode === 'recipes' ? '菜名' : mode === 'documents' ? '资料名称' : '要做什么'}
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              placeholder={
                mode === 'recipes'
                  ? '例如：番茄炒蛋'
                  : mode === 'documents'
                    ? '例如：冰箱电子发票'
                    : '例如：预约洗牙'
              }
              radius="md"
            />
            {mode === 'recipes' && (
              <TextInput
                label="食材"
                value={ingredients}
                onChange={(e) => setIngredients(e.currentTarget.value)}
                placeholder="用逗号分开，例如：鸡蛋，番茄"
                radius="md"
              />
            )}
            <TextInput
              label="分类"
              value={category}
              onChange={(e) => setCategory(e.currentTarget.value)}
              placeholder={
                mode === 'recipes'
                  ? '家常菜、早餐、汤…'
                  : mode === 'documents'
                    ? '证件资料、医疗健康、发票与保修…'
                    : '家庭、采购、工作…'
              }
              radius="md"
            />
            {mode !== 'tasks' && (
              <TextInput
                label="标签（可选）"
                value={tags}
                onChange={(e) => setTags(e.currentTarget.value)}
                placeholder="用逗号分开，例如：孩子、常用、2026"
                radius="md"
              />
            )}
            {mode === 'documents' && (
              <TextInput
                type="date"
                label="到期日期或保修期（可选）"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.currentTarget.value)}
                radius="md"
              />
            )}
            {mode === 'tasks' && (
              <>
                <TextInput
                  type="date"
                  label="截止日期（可选）"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.currentTarget.value)}
                  radius="md"
                />
                <Fieldset legend="优先级" variant="unstyled">
                  <SegmentedControl
                    fullWidth
                    color="green"
                    value={priority}
                    onChange={(value) => setPriority(value as TaskPriority)}
                    data={['普通', '重要', '紧急']}
                  />
                </Fieldset>
                <Select
                  label="重复方式"
                  value={repeat}
                  onChange={(value) => setRepeat((value || '不重复') as TaskRepeat)}
                  data={['不重复', '每天', '每周', '每月']}
                  allowDeselect={false}
                  radius="md"
                />
              </>
            )}
            <Textarea
              label={mode === 'tasks' ? '备注' : mode === 'recipes' ? '心得与备注' : '说明'}
              value={detail}
              onChange={(e) => setDetail(e.currentTarget.value)}
              placeholder="可以先简单记几句"
              minRows={3}
              autosize
              radius="md"
            />
            {mode !== 'tasks' && (
              <>
                <AttachmentPicker
                  files={files}
                  onChange={setFiles}
                  destinations={steps.map((step, index) => ({
                    id: step.id,
                    label:
                      '步骤 ' +
                      (index + 1) +
                      (step.text.trim() ? '：' + step.text.trim().slice(0, 20) : ''),
                  }))}
                  onMove={moveAttachmentToStep}
                  imagesOnly={mode === 'recipes'}
                  label={mode === 'recipes' ? '添加成品照片（可多选）' : '添加图片或文件（可多选）'}
                />
                <Stack component="section" gap="md" aria-label="步骤编辑">
                  <Group justify="space-between">
                    <Title order={3}>{mode === 'recipes' ? '制作步骤' : '操作步骤'}（可选）</Title>
                    <Text c="dimmed" size="xs">
                      {steps.length} 步
                    </Text>
                  </Group>
                  {steps.map((step, index) => (
                    <Paper withBorder radius="lg" p="md" key={step.id}>
                      <Stack gap="md">
                        <Group justify="space-between">
                          <Text fw={700}>步骤 {index + 1}</Text>
                          <Group gap={5}>
                            <ActionIcon
                              type="button"
                              variant="default"
                              disabled={index === 0}
                              aria-label={`上移步骤 ${index + 1}`}
                              onClick={() => moveStep(index, -1)}
                            >
                              <ArrowUp size={17} />
                            </ActionIcon>
                            <ActionIcon
                              type="button"
                              variant="default"
                              disabled={index === steps.length - 1}
                              aria-label={`下移步骤 ${index + 1}`}
                              onClick={() => moveStep(index, 1)}
                            >
                              <ArrowDown size={17} />
                            </ActionIcon>
                            <ActionIcon
                              type="button"
                              variant="light"
                              color="red"
                              aria-label={`删除步骤 ${index + 1}`}
                              onClick={() => setSteps(steps.filter((item) => item.id !== step.id))}
                            >
                              <Trash2 size={17} />
                            </ActionIcon>
                          </Group>
                        </Group>
                        <Textarea
                          label={`步骤 ${index + 1} 说明`}
                          value={step.text}
                          onChange={(e) =>
                            setSteps(
                              steps.map((item) =>
                                item.id === step.id
                                  ? { ...item, text: e.currentTarget.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="这一步要做什么？可以记下时间、用量和小技巧"
                          autosize
                          minRows={3}
                          radius="md"
                        />
                        <AttachmentPicker
                          files={step.attachments}
                          imagesOnly={mode === 'recipes'}
                          label={`添加步骤 ${index + 1} ${mode === 'recipes' ? '图片' : '图片或文件'}（可多选）`}
                          onReturn={(attachmentId) => returnAttachment(step.id, attachmentId)}
                          onChange={(attachments) =>
                            setSteps(
                              steps.map((item) =>
                                item.id === step.id ? { ...item, attachments } : item,
                              ),
                            )
                          }
                        />
                      </Stack>
                    </Paper>
                  ))}
                  <Button
                    type="button"
                    variant="light"
                    leftSection={<Plus size={18} />}
                    onClick={() =>
                      setSteps([...steps, { id: crypto.randomUUID(), text: '', attachments: [] }])
                    }
                  >
                    添加步骤
                  </Button>
                </Stack>
              </>
            )}
            {mode === 'recipes' && (
              <Checkbox
                checked={favorite}
                onChange={(e) => setFavorite(e.currentTarget.checked)}
                label="收藏这道菜"
                radius="sm"
              />
            )}
            {mode === 'documents' && (
              <Checkbox
                checked={important}
                onChange={(e) => setImportant(e.currentTarget.checked)}
                label="标记为重要资料"
                radius="sm"
              />
            )}
            {error && (
              <Text c="red" size="sm" role="alert">
                {error}
              </Text>
            )}
            <Button
              type="submit"
              fullWidth
              size="md"
              radius="md"
              loading={saving}
              disabled={!title.trim()}
            >
              {initialItem ? '保存修改' : '保存'}
            </Button>
          </Stack>
        </Fieldset>
      </form>
    </Drawer>
  );
}
