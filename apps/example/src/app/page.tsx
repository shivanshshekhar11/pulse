'use client';
import { usePulseFlag } from '@/lib/hooks';

export default function Home() {
    const { value: isNewHero } = usePulseFlag('new_homepage_hero');
    const { variant: themeConfig } = usePulseFlag('theme_config') as { variant: { radius?: number } | undefined };
  
    const style = themeConfig?.radius !== undefined ? { borderRadius: `${themeConfig.radius}px` } : {};
  
    return (
      <div className="max-w-4xl mx-auto mt-10" data-hero-state={String(isNewHero)}>
        {isNewHero ? (
          <div style={style} className="bg-indigo-600 text-white p-12 text-center shadow-lg transform transition hover:scale-105" data-testid="new-hero">
            <h1 className="text-5xl font-extrabold mb-4">Welcome to NovaPay 2.0!</h1>
            <p className="text-xl opacity-90">The future of payments is finally here.</p>
          </div>
        ) : (
          <div style={style} className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-12 text-center" data-testid="old-hero">
            <h1 className="text-4xl font-bold mb-4">NovaPay</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Taking payments online.</p>
          </div>
        )}
      </div>
    );
}
