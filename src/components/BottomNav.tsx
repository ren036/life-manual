import {
  ActionIcon,
  Affix,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { BookHeart, CheckSquare, Home, Images, Plus, Utensils } from 'lucide-react';
import type { AppTab } from '../types';

const items = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'notes', label: '随记', icon: BookHeart },
  { id: 'recipes', label: '菜谱', icon: Utensils },
  { id: 'documents', label: '资料库', icon: Images },
  { id: 'tasks', label: '待办', icon: CheckSquare },
] as const;

export function BottomNav({
  active,
  onChange,
  onAdd,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  onAdd?: () => void;
}) {
  return (
    <Affix position={{ bottom: 0, left: 0, right: 0 }} zIndex={7}>
      <Paper
        component="nav"
        aria-label="主要导航"
        pos="relative"
        w="100%"
        maw={480}
        mx="auto"
        px="xs"
        pt={6}
        pb="calc(6px + env(safe-area-inset-bottom))"
        radius={0}
        shadow="lg"
        bg="white"
        withBorder
      >
        {onAdd && (
          <ActionIcon
            pos="absolute"
            top={-62}
            right={24}
            size={52}
            color={active === 'notes' ? 'grape' : 'green'}
            variant="filled"
            onClick={onAdd}
            aria-label="新增"
          >
            <Plus size={24} />
          </ActionIcon>
        )}
        <SimpleGrid cols={5} spacing={0}>
          {items.map(({ id, label, icon: Icon }) => (
            <UnstyledButton
              key={id}
              aria-current={active === id ? 'page' : undefined}
              onClick={() => onChange(id)}
              py={3}
            >
              <Stack gap={1} align="center">
                <ThemeIcon
                  variant={active === id ? 'light' : 'transparent'}
                  radius="xl"
                  color={active === id ? 'green' : 'gray'}
                  size={32}
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
