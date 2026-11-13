import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  optimizeDeps: {
    include: ['lodash', 'exceljs']
  },
  resolve: {
    alias: [
      // ExcelJS's Node entry point reads process; browser tests need its real browser bundle.
      { find: /^exceljs$/, replacement: fileURLToPath(new URL('./node_modules/exceljs/dist/exceljs.min.js', import.meta.url)) },
      { find: '@app', replacement: fileURLToPath(new URL('./src/app', import.meta.url)) },
      { find: '@shared', replacement: fileURLToPath(new URL('./src/app/shared', import.meta.url)) },
      { find: '@v0', replacement: fileURLToPath(new URL('./src/app/v0', import.meta.url)) },
      { find: '@data', replacement: fileURLToPath(new URL('./src/app/data', import.meta.url)) },
      { find: '@domain', replacement: fileURLToPath(new URL('./src/app/domain', import.meta.url)) },
      { find: '@platform', replacement: fileURLToPath(new URL('./src/app/platform', import.meta.url)) }
    ]
  }
});
