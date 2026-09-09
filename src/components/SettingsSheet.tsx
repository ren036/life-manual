import {
  Drawer,
  FileButton,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  Bell,
  BellOff,
  Database,
  Download,
  HardDrive,
  MonitorDown,
  ShieldCheck,
  Tags,
  Trash2,
  Upload,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';

interface Props {
  open: boolean;
  notificationsEnabled: boolean;
  onClose: () => void;
  onToggleNotifications: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  installAvailable: boolean;
  onInstall: () => void;
  trashCount: number;
  onOpenTrash: () => void;
  lastBackupAt?: number;
  onOpenOrganize: () => void;
  onClearData: () => void;
}
function formatBytes(value = 0) {
  return value < 1024 * 1024
    ? `${Math.max(0, Math.round(value / 1024))} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`;
}
function formatDeploymentTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function SettingsSheet({
  open,
  notificationsEnabled,
  onClose,
  onToggleNotifications,
  onExport,
  onImport,
  installAvailable,
  onInstall,
  trashCount,
  onOpenTrash,
  lastBackupAt,
  onOpenOrganize,
  onClearData,
}: Props) {
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(0);
  const [persistent, setPersistent] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!open) return;
    navigator.storage?.estimate().then((estimate) => {
      setUsage(estimate.usage || 0);
      setQuota(estimate.quota || 0);
    });
    navigator.storage?.persisted?.().then(setPersistent);
  }, [open]);
  async function requestPersistence() {
    if (!navigator.storage?.persist) {
      setMessage('当前浏览器不支持持久化存储申请');
      return;
    }
    const granted = await navigator.storage.persist();
    setPersistent(granted);
    setMessage(granted ? '已启用持久化存储' : '浏览器暂未授予持久化存储');
  }
  const percent = quota ? Math.min(100, Math.round((usage / quota) * 100)) : 0;
  const Action = ({
    icon,
    title,
    description,
    onClick,
    color = 'green',
  }: {
    icon: ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    color?: string;
  }) => (
    <UnstyledButton w="100%" onClick={onClick}>
      <Paper withBorder radius="md" p="sm">
        <Group wrap="nowrap">
          <ThemeIcon color={color} variant="light" radius="xl">
            {icon}
          </ThemeIcon>
          <Stack gap={0}>
            <Text c={color === 'red' ? 'red' : undefined} fw={650} size="sm">
              {title}
            </Text>
            <Text c="dimmed" size="xs">
              {description}
            </Text>
          </Stack>
        </Group>
      </Paper>
    </UnstyledButton>
  );
  return (
    <Drawer
      opened={open}
      onClose={onClose}
      title="设置与数据"
      position="bottom"
      size="min(88vh, 680px)"
      radius="xl"
      overlayProps={{ backgroundOpacity: 0.42, blur: 3 }}
    >
      <Stack gap="sm">
        <Text c="dimmed" size="xs">
          数据只保存在当前设备
        </Text>
        <Paper withBorder radius="lg" p="md">
          <Group gap="sm" mb="sm">
            <ThemeIcon variant="light" radius="xl">
              <HardDrive size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={650} size="sm">
                本机存储
              </Text>
              <Text c="dimmed" size="xs">
                已用 {formatBytes(usage)} / 可用额度 {formatBytes(quota)}
              </Text>
            </Stack>
          </Group>
          <Progress value={percent} radius="xl" aria-label={`已使用 ${percent}%`} />
        </Paper>
        {installAvailable && (
          <Action
            icon={<MonitorDown size={18} />}
            title="安装到主屏幕"
            description="像普通应用一样快速打开"
            onClick={onInstall}
          />
        )}
        <Action
          icon={notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          title="到期通知"
          description={notificationsEnabled ? '已开启；支持的浏览器可每日后台检查' : '已关闭'}
          onClick={onToggleNotifications}
        />
        <Action
          icon={<ShieldCheck size={18} />}
          title="持久化存储"
          description={persistent ? '已启用，浏览器会尽量保留数据' : '降低浏览器自动清理数据的可能'}
          onClick={requestPersistence}
        />
        <Action
          icon={<Download size={18} />}
          title="导出完整备份"
          description={
            lastBackupAt
              ? `上次备份：${new Date(lastBackupAt).toLocaleDateString('zh-CN')}`
              : '尚未备份；包含记录、待办和附件'
          }
          onClick={onExport}
        />
        <Action
          icon={<Tags size={18} />}
          title="批量整理"
          description="统一分类并为多条内容追加标签"
          onClick={onOpenOrganize}
        />
        <Action
          icon={<Trash2 size={18} />}
          title="回收站"
          description={trashCount ? `${trashCount} 项内容将在 30 天后自动删除` : '回收站是空的'}
          onClick={onOpenTrash}
        />
        <FileButton accept="application/json,.json" onChange={(file) => file && onImport(file)}>
          {(props) => (
            <UnstyledButton {...props} w="100%">
              <Paper withBorder radius="md" p="sm">
                <Group wrap="nowrap">
                  <ThemeIcon variant="light" radius="xl">
                    <Upload size={18} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text fw={650} size="sm">
                      从备份恢复
                    </Text>
                    <Text c="dimmed" size="xs">
                      支持合并或覆盖，失败会自动回滚
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            </UnstyledButton>
          )}
        </FileButton>
        <Text c="red" size="xs" fw={700} mt="md">
          危险操作
        </Text>
        <Action
          icon={<Trash2 size={18} />}
          title="清空全部数据"
          description="删除所有记录、附件和回收站内容"
          color="red"
          onClick={onClearData}
        />
        <Group gap={7} align="flex-start" wrap="nowrap">
          <Database size={16} />
          <Text c="dimmed" size="xs">
            清除浏览器网站数据仍会删除本机记录，请定期导出备份。
          </Text>
        </Group>
        {message && (
          <Text c="green" size="sm" role="status">
            {message}
          </Text>
        )}
        <Text c="dimmed" size="xs" ta="center" pt="xs">
          版本 v{__APP_VERSION__} · 上次部署 {formatDeploymentTime(__DEPLOYED_AT__)}
        </Text>
      </Stack>
    </Drawer>
  );
}
