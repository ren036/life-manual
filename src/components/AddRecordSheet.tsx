import {
  ActionIcon,
  Button,
  Checkbox,
  Collapse,
  Drawer,
  Fieldset,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Progress,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Plus,
  ScanText,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { recordAttachments } from '../attachments';
import { categoryOptions, parseTags } from '../categories';
import { parseIngredients } from '../ingredients';
import { recognizeDocument } from '../ocr';
import { parseRelatedRecordKey, relatedRecordKey } from '../relatedRecords';
import { getAttachmentFiles } from '../storage/database';
import { AttachmentPicker } from './AttachmentPicker';
import type {
  AddMode,
  Attachment,
  DocumentItem,
  DraftAttachment,
  PendingAttachment,
  Recipe,
  RelatedRecordRef,
  TaskItem,
  TaskPriority,
  TaskRepeat,
  TaskRepeatUnit,
  TaskOverduePolicy,
} from '../types';

type SavedItem = Recipe | DocumentItem | TaskItem;
interface Props {
  open: boolean;
  mode: AddMode;
  initialItem?: SavedItem;
  onClose: () => void;
  onSave: (item: SavedItem, files: PendingAttachment[]) => Promise<void>;
  relatedRecordOptions: { value: string; label: string }[];
  defaultRelatedRecord?: RelatedRecordRef;
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

export function AddRecordSheet({
  open,
  mode,
  initialItem,
  onClose,
  onSave,
  relatedRecordOptions,
  defaultRelatedRecord,
}: Props) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [tags, setTags] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [priority, setPriority] = useState<TaskPriority>('普通');
  const [repeat, setRepeat] = useState<TaskRepeat>('不重复');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatUnit, setRepeatUnit] = useState<TaskRepeatUnit>('天');
  const [repeatWeekdays, setRepeatWeekdays] = useState<string[]>([]);
  const [repeatMonthDay, setRepeatMonthDay] = useState(1);
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [overduePolicy, setOverduePolicy] = useState<TaskOverduePolicy>('按原计划顺延');
  const [important, setImportant] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [relatedRecord, setRelatedRecord] = useState<string | null>(null);
  const [files, setFiles] = useState<DraftAttachment[]>([]);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
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
      initialItem && 'ingredients' in initialItem ? initialItem.ingredients.join('\n') : '',
    );
    setTags(initialItem ? (initialItem.tags || []).join('，') : '');
    setDueDate(initialItem && 'completed' in initialItem ? initialItem.dueDate || '' : '');
    setExpiryDate(initialItem && 'description' in initialItem ? initialItem.expiryDate || '' : '');
    setOcrText(initialItem && 'description' in initialItem ? initialItem.ocrText || '' : '');
    setOcrRunning(false);
    setOcrProgress(0);
    setPriority(initialItem && 'completed' in initialItem ? initialItem.priority : '普通');
    setRepeat(
      initialItem && 'completed' in initialItem ? initialItem.repeat || '不重复' : '不重复',
    );
    setRepeatInterval(
      initialItem && 'completed' in initialItem ? initialItem.repeatInterval || 1 : 1,
    );
    setRepeatUnit(
      initialItem && 'completed' in initialItem ? initialItem.repeatUnit || '天' : '天',
    );
    setRepeatWeekdays(
      initialItem && 'completed' in initialItem
        ? (initialItem.repeatWeekdays || []).map(String)
        : [],
    );
    setRepeatMonthDay(
      initialItem && 'completed' in initialItem ? initialItem.repeatMonthDay || 1 : 1,
    );
    setRepeatEndDate(
      initialItem && 'completed' in initialItem ? initialItem.repeatEndDate || '' : '',
    );
    setOverduePolicy(
      initialItem && 'completed' in initialItem
        ? initialItem.overduePolicy || '按原计划顺延'
        : '按原计划顺延',
    );
    setImportant(initialItem && 'important' in initialItem ? initialItem.important : false);
    setFavorite(initialItem && 'ingredients' in initialItem ? !!initialItem.favorite : false);
    setRelatedRecord(
      initialItem && 'completed' in initialItem && initialItem.relatedRecord
        ? relatedRecordKey(initialItem.relatedRecord)
        : defaultRelatedRecord
          ? relatedRecordKey(defaultRelatedRecord)
          : null,
    );
    setFiles(initialItem && !('completed' in initialItem) ? recordAttachments(initialItem) : []);
    setSteps(
      initialItem && !('completed' in initialItem)
        ? initialItem.steps?.map((step) => ({ ...step, attachments: [...step.attachments] })) || []
        : [],
    );
    setError('');
    setAdvancedOpen(!!initialItem || !!defaultRelatedRecord);
    setStepsOpen(!!(initialItem && !('completed' in initialItem) && initialItem.steps?.length));
  }, [mode, open, initialItem, defaultRelatedRecord]);
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
  async function runOcr() {
    const attachment = files.find((file) => file.type.startsWith('image/'));
    if (!attachment) {
      setError('请先添加或拍摄一张资料图片。');
      return;
    }
    setOcrRunning(true);
    setOcrProgress(0);
    setError('');
    try {
      const file = attachment.file || (await getAttachmentFiles([attachment]))[0]?.file;
      if (!file) throw new Error('missing image');
      const text = await recognizeDocument(file, (progress) => setOcrProgress(progress.progress));
      if (!text) {
        setError('没有识别到文字，可以换一张更清晰、光线更均匀的图片。');
        return;
      }
      setOcrText((current) => [current.trim(), text].filter(Boolean).join('\n\n'));
    } catch {
      setError('文字识别失败，请检查图片和设备存储空间后重试。');
    } finally {
      setOcrRunning(false);
    }
  }
  async function submit() {
    if (!title.trim() || savingRef.current) return;
    if (mode === 'tasks' && repeat !== '不重复' && !dueDate) {
      setError('重复待办需要设置首次截止日期。');
      return;
    }
    if (repeatEndDate && dueDate && repeatEndDate < dueDate) {
      setError('重复结束日期不能早于首次截止日期。');
      return;
    }
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
        tags: parseTags(tags),
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
          ingredients: parseIngredients(ingredients),
          category: category.trim() || '家常菜',
          favorite,
          cookingRecords:
            initialItem && 'ingredients' in initialItem ? initialItem.cookingRecords : undefined,
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
          ocrText: ocrText.trim() || undefined,
          date: initialItem && !('completed' in initialItem) ? initialItem.date : '刚刚',
          isImage: files[0]?.type.startsWith('image/'),
        };
      else
        item = {
          ...base,
          notes: detail.trim(),
          category: category.trim() || '生活',
          tags: content.tags,
          dueDate: dueDate || undefined,
          priority,
          repeat: repeat === '不重复' ? undefined : repeat,
          repeatInterval: repeat === '自定义' ? repeatInterval : undefined,
          repeatUnit: repeat === '自定义' ? repeatUnit : undefined,
          repeatWeekdays:
            repeat === '每周' || (repeat === '自定义' && repeatUnit === '周')
              ? repeatWeekdays.map(Number)
              : undefined,
          repeatMonthDay:
            repeat === '每月' || (repeat === '自定义' && repeatUnit === '月')
              ? repeatMonthDay
              : undefined,
          repeatEndDate: repeat === '不重复' ? undefined : repeatEndDate || undefined,
          repeatAnchorDate:
            repeat === '不重复'
              ? undefined
              : initialItem && 'completed' in initialItem
                ? initialItem.repeatAnchorDate || initialItem.dueDate || dueDate
                : dueDate,
          overduePolicy: repeat === '不重复' ? undefined : overduePolicy,
          relatedRecord: parseRelatedRecordKey(relatedRecord),
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
    if (!savingRef.current && !ocrRunning) onClose();
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
      closeButtonProps={{ disabled: saving || ocrRunning, 'aria-label': '关闭' }}
      overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Fieldset disabled={saving || ocrRunning} variant="unstyled">
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
              <Textarea
                label="食材"
                value={ingredients}
                onChange={(e) => setIngredients(e.currentTarget.value)}
                placeholder={'一行一种，例如：\n鸡蛋 2 个\n番茄 300 克'}
                description="一行一种食材，用量和单位会完整保留"
                autosize
                minRows={3}
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
              <TextInput
                type="date"
                label="截止日期（可选）"
                value={dueDate}
                onChange={(e) => setDueDate(e.currentTarget.value)}
                radius="md"
              />
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
            <Button
              type="button"
              variant="light"
              color="gray"
              leftSection={<SlidersHorizontal size={17} />}
              rightSection={
                <ChevronDown
                  size={17}
                  style={{ transform: advancedOpen ? 'rotate(180deg)' : undefined }}
                />
              }
              justify="space-between"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
            >
              更多设置
            </Button>
            <Collapse expanded={advancedOpen}>
              <Paper withBorder radius="lg" p="md">
                <Stack gap="md">
                  <Select
                    label="分类"
                    value={category}
                    onChange={(value) => setCategory(value || '')}
                    data={categoryOptions(mode, category)}
                    placeholder="选择分类"
                    searchable
                    allowDeselect={false}
                    radius="md"
                  />
                  <TextInput
                    label="标签（可选）"
                    value={tags}
                    onChange={(e) => setTags(e.currentTarget.value)}
                    placeholder="用逗号分开，例如：孩子、常用、2026"
                    radius="md"
                  />
                  {mode === 'tasks' && (
                    <>
                      <Select
                        label="关联菜谱或资料（可选）"
                        placeholder="选择关联内容"
                        value={relatedRecord}
                        onChange={setRelatedRecord}
                        data={relatedRecordOptions}
                        searchable
                        clearable
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
                        data={['不重复', '每天', '每周', '每月', '自定义']}
                        allowDeselect={false}
                        radius="md"
                      />
                      {repeat === '自定义' && (
                        <Group grow align="flex-start">
                          <NumberInput
                            label="间隔"
                            value={repeatInterval}
                            onChange={(value) => setRepeatInterval(Math.max(1, Number(value) || 1))}
                            min={1}
                            max={365}
                            allowDecimal={false}
                          />
                          <Select
                            label="周期单位"
                            value={repeatUnit}
                            onChange={(value) => setRepeatUnit((value || '天') as TaskRepeatUnit)}
                            data={['天', '周', '月']}
                            allowDeselect={false}
                          />
                        </Group>
                      )}
                      {(repeat === '每周' || (repeat === '自定义' && repeatUnit === '周')) && (
                        <MultiSelect
                          label="在星期几重复"
                          description="不选择时沿用首次截止日期的星期"
                          value={repeatWeekdays}
                          onChange={setRepeatWeekdays}
                          data={[
                            { value: '1', label: '周一' },
                            { value: '2', label: '周二' },
                            { value: '3', label: '周三' },
                            { value: '4', label: '周四' },
                            { value: '5', label: '周五' },
                            { value: '6', label: '周六' },
                            { value: '0', label: '周日' },
                          ]}
                        />
                      )}
                      {(repeat === '每月' || (repeat === '自定义' && repeatUnit === '月')) && (
                        <NumberInput
                          label="每月日期"
                          description="月份天数不足时使用当月最后一天"
                          value={repeatMonthDay}
                          onChange={(value) =>
                            setRepeatMonthDay(Math.min(31, Math.max(1, Number(value) || 1)))
                          }
                          min={1}
                          max={31}
                          allowDecimal={false}
                        />
                      )}
                      {repeat !== '不重复' && (
                        <>
                          <TextInput
                            type="date"
                            label="重复结束日期（可选）"
                            value={repeatEndDate}
                            onChange={(event) => setRepeatEndDate(event.currentTarget.value)}
                            min={dueDate || undefined}
                          />
                          <Select
                            label="逾期后的下一次"
                            value={overduePolicy}
                            onChange={(value) =>
                              setOverduePolicy((value || '按原计划顺延') as TaskOverduePolicy)
                            }
                            data={['按原计划顺延', '从完成日期顺延']}
                            allowDeselect={false}
                          />
                        </>
                      )}
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
                </Stack>
              </Paper>
            </Collapse>
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
                  enableCamera={mode === 'documents'}
                  label={mode === 'recipes' ? '添加成品照片（可多选）' : '添加图片或文件（可多选）'}
                />
                {mode === 'documents' && (
                  <Paper withBorder radius="lg" p="md">
                    <Stack gap="sm">
                      <Button
                        type="button"
                        variant="light"
                        leftSection={<ScanText size={18} />}
                        loading={ocrRunning}
                        disabled={!files.some((file) => file.type.startsWith('image/'))}
                        onClick={() => void runOcr()}
                      >
                        识别首张图片文字
                      </Button>
                      {ocrRunning && (
                        <Progress
                          value={Math.round(ocrProgress * 100)}
                          animated
                          aria-label={`文字识别进度 ${Math.round(ocrProgress * 100)}%`}
                        />
                      )}
                      <Text c="dimmed" size="xs">
                        首次识别会加载本地中文模型，之后可离线使用；图片不会上传。
                      </Text>
                      {(ocrText || ocrRunning) && (
                        <Textarea
                          label="识别文字（可编辑，会参与搜索）"
                          value={ocrText}
                          onChange={(event) => setOcrText(event.currentTarget.value)}
                          minRows={5}
                          autosize
                        />
                      )}
                    </Stack>
                  </Paper>
                )}
                {!stepsOpen && !steps.length && (
                  <Button
                    type="button"
                    variant="subtle"
                    leftSection={<Plus size={18} />}
                    onClick={() => setStepsOpen(true)}
                  >
                    {mode === 'recipes' ? '添加制作步骤（可选）' : '添加操作步骤（可选）'}
                  </Button>
                )}
                <Collapse expanded={stepsOpen || !!steps.length}>
                  <Stack component="section" gap="md" aria-label="步骤编辑">
                    <Group justify="space-between">
                      <Title order={3}>
                        {mode === 'recipes' ? '制作步骤' : '操作步骤'}（可选）
                      </Title>
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
                                onClick={() =>
                                  setSteps(steps.filter((item) => item.id !== step.id))
                                }
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
                </Collapse>
              </>
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
              disabled={!title.trim() || ocrRunning}
            >
              {initialItem ? '保存修改' : '保存'}
            </Button>
          </Stack>
        </Fieldset>
      </form>
    </Drawer>
  );
}
