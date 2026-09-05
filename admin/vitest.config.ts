import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: { alias: [{ find: /^\.\.\/firebase$/, replacement: path.resolve(__dirname, 'src/__tests__/firebaseStub.ts') }] },
  plugins: [react() as any],
  test: {
    include: [path.resolve(__dirname, 'src/__tests__/**/*.test.{ts,tsx}').replace(/\\/g, '/')],
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, 'src/__tests__/setup.ts')],
  },
});
