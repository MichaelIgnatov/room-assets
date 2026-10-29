import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'), 
    },
  },
  server: {
    host: true,        // эквивалент "0.0.0.0"
    port: 5173,
    strictPort: true,  // порт прокинут в compose как 5173:5173, автосмена сломала бы проброс
    // В Docker на Windows-хосте события ФС не долетают в контейнер — включаем polling флагом из compose
    //watch: { usePolling: !!process.env.CHOKIDAR_USEPOLLING }
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  }
})