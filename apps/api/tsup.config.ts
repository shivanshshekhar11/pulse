import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  shims: true,
  // Bundle workspace dependencies (like @pulse-flags/types) to prevent runtime import failures
  noExternal: ['@pulse-flags/types'],
});
