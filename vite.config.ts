
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Explicitly mapping the API_KEY to ensure it's replaced during build on Vercel
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
