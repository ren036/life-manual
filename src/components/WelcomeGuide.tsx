import { Button, Group, Modal, Progress, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { Database, Heart, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export function WelcomeGuide({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pages = [
    {
      icon: <Heart size={28} />,
      title: '欢迎使用生活手册',
      body: '随手记下，想用时找得到。随记、资料和菜谱都收在「记录」，今天要做的事放在「待办」。',
    },
    {
      icon: <ShieldCheck size={28} />,
      title: '本地保存，尊重隐私',
      body: '你的文字和附件默认只保存在当前浏览器，不会自动上传。清除网站数据或更换设备前，请先导出完整备份。',
    },
    {
      icon: <Database size={28} />,
      title: '从空白手册开始',
      body: '从「今天」点一下就能记下想法，也可以保存资料、添加待办。你的手册从第一条真实记录开始。',
    },
  ];
  const page = pages[step];
  async function finish() {
    setSaving(true);
    setError('');
    try {
      await onComplete();
    } catch {
      setError('初始化失败，请检查浏览器存储空间后重试。');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      opened={open}
      onClose={() => undefined}
      centered
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      title={null}
      radius="xl"
      size="min(440px, calc(100vw - 24px))"
    >
      <Stack gap="lg" p="xs">
        <Progress value={((step + 1) / pages.length) * 100} size="xs" />
        <ThemeIcon size={58} radius="xl" variant="light">
          {page.icon}
        </ThemeIcon>
        <Stack gap="xs">
          <Text c="dimmed" size="xs" fw={700}>
            {step + 1} / {pages.length}
          </Text>
          <Title order={2}>{page.title}</Title>
          <Text c="dimmed" lh={1.7}>
            {page.body}
          </Text>
        </Stack>
        {error && (
          <Text c="red" size="sm" role="alert">
            {error}
          </Text>
        )}
        <Group justify="space-between">
          <Button
            variant="subtle"
            disabled={step === 0 || saving}
            onClick={() => setStep(step - 1)}
          >
            上一步
          </Button>
          {step < pages.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>继续</Button>
          ) : (
            <Button loading={saving} onClick={() => void finish()}>
              开始使用
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
