import { Box, Button, Drawer, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useEffect, useState, type ReactNode } from 'react';
import './EditorSheet.css';

interface Props {
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  canSave: boolean;
  busy?: boolean;
  error?: string;
  color?: string;
  draft: {
    ready: boolean;
    status: 'idle' | 'saving' | 'saved' | 'error';
    restored: boolean;
    dirty: boolean;
    discard: () => Promise<void>;
  };
}

export function EditorSheet({
  title,
  children,
  onClose,
  onSave,
  saveLabel,
  canSave,
  busy = false,
  error,
  color = 'blue',
  draft,
}: Props) {
  const [viewport, setViewport] = useState<{ height: number; top: number }>();
  const [discardError, setDiscardError] = useState('');
  useEffect(() => {
    const visual = window.visualViewport;
    if (!visual) return;
    const update = () => setViewport({ height: visual.height, top: visual.offsetTop });
    update();
    visual.addEventListener('resize', update);
    visual.addEventListener('scroll', update);
    return () => {
      visual.removeEventListener('resize', update);
      visual.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <Drawer
      opened
      onClose={onClose}
      position="bottom"
      radius="xl"
      size={viewport ? `min(92dvh, ${viewport.height}px)` : '92dvh'}
      title={title}
      classNames={{
        content: 'editor-sheet',
        body: 'editor-sheet__body',
        header: 'editor-sheet__header',
      }}
      styles={{
        inner: viewport
          ? { top: viewport.top, bottom: 'auto', height: viewport.height }
          : undefined,
      }}
      closeButtonProps={{
        disabled: busy || !draft.ready,
        size: 44,
        'aria-label': '关闭并保留草稿',
      }}
      closeOnClickOutside={!busy && draft.ready}
      closeOnEscape={!busy && draft.ready}
      overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
    >
      <form
        className="editor-sheet__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave && !busy && draft.ready) onSave();
        }}
      >
        <Box className="editor-sheet__scroll">{children}</Box>
        <Stack gap={6} className="editor-sheet__footer">
          {(error || discardError) && (
            <Text c="red" size="sm" role="alert">
              {error || discardError}
            </Text>
          )}
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text size="xs" c={draft.status === 'error' ? 'red' : 'dimmed'} role="status">
              {!draft.ready
                ? '正在读取草稿…'
                : draft.status === 'error'
                  ? '草稿未能保存，请先保存记录再关闭'
                  : draft.status === 'saving'
                    ? '正在保留草稿…'
                    : draft.dirty
                      ? draft.restored
                        ? '已恢复草稿，可继续填写'
                        : '草稿已保存在本机'
                      : '可以先简单记录，以后再补充'}
            </Text>
            {draft.dirty && (
              <Button
                type="button"
                variant="subtle"
                color="gray"
                size="compact-sm"
                mih={44}
                disabled={busy}
                onClick={() =>
                  modals.openConfirmModal({
                    title: '放弃这份草稿？',
                    centered: true,
                    zIndex: 500,
                    children: (
                      <Text size="sm">
                        本次未保存的文字和新增附件会被清除，已保存的记录不受影响。
                      </Text>
                    ),
                    labels: { confirm: '放弃草稿', cancel: '继续填写' },
                    confirmProps: { color: 'red' },
                    onConfirm: () => {
                      void draft.discard().catch(() => setDiscardError('草稿清除失败，请重试。'));
                    },
                  })
                }
              >
                放弃草稿
              </Button>
            )}
          </Group>
          <Button
            type="submit"
            fullWidth
            size="md"
            mih={46}
            color={color}
            loading={busy}
            disabled={!canSave || !draft.ready}
          >
            {saveLabel}
          </Button>
        </Stack>
      </form>
    </Drawer>
  );
}
