import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import App from './App';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <ModalsProvider labels={{ confirm: '确认', cancel: '取消' }}>
        <Notifications position="bottom-center" limit={3} />
        <App />
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    const announceUpdate = () => window.dispatchEvent(new CustomEvent('life-manual-update'));
    if (registration.waiting) announceUpdate();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) announceUpdate();
      });
    });
  });
}
