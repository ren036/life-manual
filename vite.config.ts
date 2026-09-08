import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __DEPLOYED_AT__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@mantine')) return 'mantine';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler'))
            return 'react-vendor';
        },
      },
    },
  },
});
