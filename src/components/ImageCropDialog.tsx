import { Button, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { cropImage, FULL_IMAGE, type CropArea } from '../imageCrop';
import './ImageCropDialog.css';

type Handle = 'nw' | 'ne' | 'sw' | 'se';
type DragMode = Handle | 'move' | 'select';
const handleLabels: Record<Handle, string> = {
  nw: '左上角',
  ne: '右上角',
  sw: '左下角',
  se: '右下角',
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const MIN_SIZE = 0.03;

function resize(area: CropArea, handle: Handle, dx: number, dy: number): CropArea {
  const left = handle.includes('w')
    ? clamp(area.x + dx, 0, area.x + area.width - MIN_SIZE)
    : area.x;
  const top = handle.includes('n')
    ? clamp(area.y + dy, 0, area.y + area.height - MIN_SIZE)
    : area.y;
  const right = handle.includes('e')
    ? clamp(area.x + area.width + dx, area.x + MIN_SIZE, 1)
    : area.x + area.width;
  const bottom = handle.includes('s')
    ? clamp(area.y + area.height + dy, area.y + MIN_SIZE, 1)
    : area.y + area.height;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function ImageCropDialog({
  file,
  progress,
  onApply,
  onOriginal,
  onClose,
}: {
  file: File;
  progress?: string;
  onApply: (file: File) => Promise<void>;
  onOriginal: () => Promise<void>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [area, setArea] = useState<CropArea>(FULL_IMAGE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const busyRef = useRef(false);
  const dragRef = useRef<{
    mode: DragMode;
    x: number;
    y: number;
    area: CropArea;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);

  function point(event: PointerEvent) {
    const bounds = stageRef.current!.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
    };
  }

  function start(event: PointerEvent, mode: DragMode) {
    if (busyRef.current || !loaded || dragRef.current || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const { x, y } = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode, x, y, area, pointerId: event.pointerId };
  }

  function move(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const { x, y } = point(event);
    const dx = x - drag.x;
    const dy = y - drag.y;
    if (drag.mode === 'move') {
      setArea({
        ...drag.area,
        x: clamp(drag.area.x + dx, 0, 1 - drag.area.width),
        y: clamp(drag.area.y + dy, 0, 1 - drag.area.height),
      });
    } else if (drag.mode === 'select') {
      if (Math.abs(dx) < MIN_SIZE || Math.abs(dy) < MIN_SIZE) return;
      setArea({
        x: Math.min(x, drag.x),
        y: Math.min(y, drag.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      });
    } else {
      setArea(resize(drag.area, drag.mode, dx, dy));
    }
  }

  function keyboard(event: KeyboardEvent, handle?: Handle) {
    if (
      busyRef.current ||
      !loaded ||
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = stageRef.current!.getBoundingClientRect();
    const step = event.shiftKey ? 10 : 1;
    const dx =
      (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0) / bounds.width;
    const dy =
      (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0) / bounds.height;
    setArea((current) =>
      handle
        ? resize(current, handle, dx, dy)
        : {
            ...current,
            x: clamp(current.x + dx, 0, 1 - current.width),
            y: clamp(current.y + dy, 0, 1 - current.height),
          },
    );
  }

  async function finish(original: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      if (original) await onOriginal();
      else if (imageRef.current) await onApply(await cropImage(imageRef.current, file, area));
    } catch {
      setError('裁剪失败，请重试或选择使用原图。');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      opened
      onClose={() => !busyRef.current && onClose()}
      title={`裁剪照片${progress ? ` · ${progress}` : ''}`}
      centered
      size="lg"
      zIndex={400}
      closeOnClickOutside={false}
      closeOnEscape={!busy}
      closeButtonProps={{ disabled: busy, 'aria-label': '取消裁剪' }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed" id="crop-instructions">
          拖动四角调整范围，拖动选区移动位置，也可以在选区外重新框选。键盘方向键可微调，按住 Shift
          可加快。
        </Text>
        <div className="image-crop-preview">
          {!loaded && !failed && <Loader aria-label="正在加载照片" />}
          {failed && (
            <Text c="red" role="alert">
              这张图片无法裁剪，可以使用原图继续。
            </Text>
          )}
          {url && !failed && (
            <div
              ref={stageRef}
              className="image-crop-stage"
              style={{ display: loaded ? 'block' : 'none' }}
              onPointerDown={(event) => start(event, 'select')}
              onPointerMove={move}
              onPointerUp={() => {
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
              onLostPointerCapture={() => {
                dragRef.current = null;
              }}
            >
              <img
                ref={imageRef}
                src={url}
                alt={file.name}
                draggable={false}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
              />
              <div
                className="image-crop-selection"
                role="group"
                tabIndex={0}
                aria-label="裁剪选区，使用方向键移动"
                aria-describedby="crop-instructions"
                style={{
                  left: `${area.x * 100}%`,
                  top: `${area.y * 100}%`,
                  width: `${area.width * 100}%`,
                  height: `${area.height * 100}%`,
                }}
                onPointerDown={(event) => start(event, 'move')}
                onKeyDown={(event) => keyboard(event)}
              >
                <div className="image-crop-grid" aria-hidden="true" />
                {(Object.keys(handleLabels) as Handle[]).map((handle) => (
                  <button
                    type="button"
                    key={handle}
                    className={`image-crop-handle image-crop-handle-${handle}`}
                    aria-label={`调整裁剪${handleLabels[handle]}`}
                    disabled={busy}
                    onPointerDown={(event) => start(event, handle)}
                    onKeyDown={(event) => keyboard(event, handle)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {loaded && (
          <Text size="xs" c="dimmed" aria-live="polite">
            选取尺寸：{Math.max(1, Math.round((imageRef.current?.naturalWidth || 0) * area.width))}{' '}
            × {Math.max(1, Math.round((imageRef.current?.naturalHeight || 0) * area.height))} 像素
          </Text>
        )}
        {file.type === 'image/gif' && (
          <Text size="xs" c="dimmed">
            裁剪后将保存为静态图片；使用原图可保留动画。
          </Text>
        )}
        {error && (
          <Text c="red" size="sm" role="alert">
            {error}
          </Text>
        )}
        <Group justify="space-between">
          <Button
            type="button"
            variant="subtle"
            disabled={!loaded || busy}
            onClick={() => setArea(FULL_IMAGE)}
          >
            重置选区
          </Button>
          <Group gap="xs">
            <Button
              type="button"
              variant="default"
              disabled={busy}
              onClick={() => void finish(true)}
            >
              使用原图
            </Button>
            <Button
              type="button"
              loading={busy}
              disabled={!loaded}
              onClick={() => void finish(false)}
            >
              确认裁剪
            </Button>
          </Group>
        </Group>
        <Text size="xs" c="dimmed">
          裁剪在本机完成，不会修改相册原图。
        </Text>
      </Stack>
    </Modal>
  );
}
