import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/gorrilas-dhaka/' : '/',
  server: {
    host: true,
    port: 5173
  }
}));
