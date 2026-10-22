import { ActionIcon, Menu } from '@mantine/core';
import { MoreHorizontal, Pencil, SkipForward, Trash2 } from 'lucide-react';

export function RecordActionsMenu({
  title,
  onEdit,
  onDelete,
  onSkip,
  disabled = false,
}: {
  title: string;
  onEdit: () => void;
  onDelete: () => void;
  onSkip?: () => void;
  disabled?: boolean;
}) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size={44}
          disabled={disabled}
          aria-label={'更多操作：' + title}
        >
          <MoreHorizontal size={21} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item mih={44} leftSection={<Pencil size={17} />} onClick={onEdit}>
          编辑
        </Menu.Item>
        {onSkip && (
          <Menu.Item mih={44} leftSection={<SkipForward size={17} />} onClick={onSkip}>
            跳过本次
          </Menu.Item>
        )}
        <Menu.Item mih={44} color="red" leftSection={<Trash2 size={17} />} onClick={onDelete}>
          移到回收站
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
