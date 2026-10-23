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
import './redesign.css';

const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: { light: 7, dark: 6 },
  defaultRadius: 'md',
  radius: { xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '20px' },
  fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  fontSizes: { xs: '13px', sm: '15px', md: '16px', lg: '18px', xl: '21px' },
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeight: '650',
  },
  defaultGradient: { from: 'blue.8', to: 'blue.6', deg: 135 },
  components: {
    Button: { defaultProps: { radius: 'md', fw: 600 } },
    ActionIcon: { defaultProps: { radius: 'xl' } },
    TextInput: { defaultProps: { radius: 'md', size: 'md' } },
    Select: { defaultProps: { radius: 'lg', size: 'md' } },
    Textarea: { defaultProps: { radius: 'lg', size: 'md' } },
  },
  colors: {
    blue: [
      '#edf2ff',
      '#dbe5ff',
      '#bacfff',
      '#91b2ff',
      '#6792f5',
      '#4a78ea',
      '#3566df',
      '#2856c9',
      '#214aad',
      '#183a8c',
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
        <Notifications position="top-center" zIndex={190} limit={3} />
        <HashRouter>
          <App />
        </HashRouter>
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
);

registerServiceWorker();
