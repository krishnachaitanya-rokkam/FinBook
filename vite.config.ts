import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages serves this app from the repository Pages path.
  // Keep this aligned with the live URL: /expense-tracker/
  base: '/expense-tracker/',
  plugins: [
    react(),
    tailwindcss(),
  ],
});
