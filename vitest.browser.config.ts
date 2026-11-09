import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  optimizeDeps: {
    include: ['lodash']
  },
  resolve: {
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/app/shared', import.meta.url)),
      '@v0': fileURLToPath(new URL('./src/app/v0', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/app/data', import.meta.url)),
      '@domain': fileURLToPath(new URL('./src/app/domain', import.meta.url)),
      '@platform': fileURLToPath(new URL('./src/app/platform', import.meta.url))
    }
  }
});
