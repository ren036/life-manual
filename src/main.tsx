import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, localStorageColorSchemeManager, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { HashRouter } from 'react-router';
import App from './App';
import { registerServiceWorker } from './serviceWorker';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';
import './theme.css';

const theme = createTheme({
  primaryColor: 'green',
  primaryShade: 7,
  defaultRadius: 'lg',
  fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeight: '800',
  },
  defaultGradient: { from: 'green.8', to: 'green.6', deg: 135 },
  components: {
    Button: { defaultProps: { radius: 'xl' } },
    ActionIcon: { defaultProps: { radius: 'xl' } },
    TextInput: { defaultProps: { radius: 'lg', size: 'md' } },
    Select: { defaultProps: { radius: 'lg', size: 'md' } },
    Textarea: { defaultProps: { radius: 'lg', size: 'md' } },
  },
  colors: {
    green: [
      '#f0f8f3',
      '#dceee3',
      '#badcc8',
      '#91c5a5',
      '#67ac82',
      '#478f65',
      '#2f6b4f',
      '#285d45',
      '#214f3b',
      '#153326',
    ],
  },
});

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'mantine-color-scheme-value',
});

// 旧版本使用 #recipes/id 一类地址；HashRouter 使用 #/recipes/id。
const legacyHash = window.location.hash.slice(1);
if (legacyHash && !legacyHash.startsWith('/')) {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#/${legacyHash}`,
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      defaultColorScheme="light"
      colorSchemeManager={colorSchemeManager}
    >
      <ModalsProvider labels={{ confirm: '确认', cancel: '取消' }}>
        <Notifications position="bottom-center" limit={3} />
        <HashRouter>
          <App />
        </HashRouter>
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
);

registerServiceWorker();
