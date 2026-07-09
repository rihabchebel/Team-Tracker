import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },

  server: {
    host: 'TeamTracker',
    port: 5173,
    https: {
      key: fs.readFileSync('./TeamTracker+3-key.pem'),  // mkcer private key
      cert: fs.readFileSync('./TeamTracker+3.pem'),     // mkcer certificate
    },
  },

  preview: {
    host: 'TeamTracker',
    port: 5173,
    https: {
      key: fs.readFileSync('./TeamTracker+3-key.pem'),  // mkcer private key
      cert: fs.readFileSync('./TeamTracker+3.pem'),     // mkcer certificate
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
  },

  envPrefix: 'VITE_',
});