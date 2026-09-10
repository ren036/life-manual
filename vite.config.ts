import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

const deployedAt = new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emit-deployment-version',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ deployedAt }),
        });
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __DEPLOYED_AT__: JSON.stringify(deployedAt),
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
