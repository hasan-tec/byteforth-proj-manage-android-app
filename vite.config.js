import { defineConfig } from 'vite';

// This is a minimal Vite config to help Vercel recognize the project
// The actual build process will be handled by Expo's build scripts
export default defineConfig({
  // This is just a placeholder as Expo handles the actual build
  build: {
    outDir: 'dist'
  },
  // Ensure Vite doesn't conflict with Expo's build process
  optimizeDeps: {
    disabled: true
  }
});
