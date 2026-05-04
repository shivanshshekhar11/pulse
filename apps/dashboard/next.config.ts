import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile workspace packages so Next.js/Turbopack can process their
  // TypeScript/JSX source directly without a separate build step.
  transpilePackages: ['@pulse-flags/ui', '@pulse-flags/types'],

  images: {
    // Next.js 16 default changed from 60s → 4h. We keep 4h explicitly so
    // the intent is clear if someone reads this config.
    minimumCacheTTL: 14400,
  },
};

export default nextConfig;
