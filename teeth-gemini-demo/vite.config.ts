import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    watch: {
      // Jest coverage HTML rewrites were forcing full page reloads and breaking
      // lazy route imports ("Failed to fetch dynamically imported module").
      ignored: ['**/coverage/**', '**/node_modules/**'],
    },
  },
});
