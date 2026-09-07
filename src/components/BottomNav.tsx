import { Affix, Paper, SimpleGrid, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { CheckSquare, Home, Images, Utensils } from 'lucide-react';
import type { AppTab } from '../types';
const items = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'recipes', label: '菜谱', icon: Utensils },
  { id: 'documents', label: '资料库', icon: Images },
  { id: 'tasks', label: '待办', icon: CheckSquare },
] as const;
export function BottomNav({
  active,
  onChange,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  return (
    <Affix position={{ bottom: 0, left: 0, right: 0 }} zIndex={7}>
      <Paper
        component="nav"
        aria-label="主要导航"
        maw={480}
        mx="auto"
        p="xs"
        pb="calc(8px + env(safe-area-inset-bottom))"
        radius={0}
        shadow="md"
        withBorder
      >
        <SimpleGrid cols={4} spacing={0}>
          {items.map(({ id, label, icon: Icon }) => (
            <UnstyledButton
              key={id}
              aria-current={active === id ? 'page' : undefined}
              onClick={() => onChange(id)}
            >
              <Stack gap={2} align="center">
                <ThemeIcon
                  variant={active === id ? 'light' : 'transparent'}
                  radius="xl"
                  color={active === id ? 'green' : 'gray'}
                >
                  <Icon size={20} />
                </ThemeIcon>
                <Text
                  size="xs"
                  c={active === id ? 'green.8' : 'dimmed'}
                  fw={active === id ? 700 : 500}
                >
                  {label}
                </Text>
              </Stack>
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Paper>
    </Affix>
  );
}
