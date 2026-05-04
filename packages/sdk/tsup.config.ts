import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // Source maps are useful for consumers debugging issues in the SDK.
  // They are included in the published package intentionally.
  sourcemap: true,
  splitting: false,
  // Bundle @pulse-flags/types so it is not listed as a runtime dependency.
  // The types package is private and will never be published to npm.
  // All type definitions are inlined into dist/index.d.ts by the dts build.
  noExternal: ['@pulse-flags/types'],
});
