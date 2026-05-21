'use client';
import { usePulseFlag } from '@/lib/hooks';

export default function Pricing() {
  const { variant: ctaText } = usePulseFlag('pricing_cta_text');

  return (
    <div className="max-w-2xl mx-auto mt-10 text-center">
      <h1 className="text-3xl font-bold mb-6">Simple Pricing</h1>
      <div className="border border-gray-200 dark:border-gray-800 p-8 rounded-xl bg-white dark:bg-gray-950 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Pro Plan</h2>
        <p className="text-4xl font-extrabold mb-6"><span className="text-lg text-gray-500 font-normal">/mo</span></p>
        <button 
          data-testid="pricing-cta"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg w-full transition"
        >
          {String(ctaText)}
        </button>
      </div>
    </div>
  );
}
