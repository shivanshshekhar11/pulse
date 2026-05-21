'use client';
import { useState } from 'react';
import { usePulseFlag } from '@/lib/hooks';

export default function Dashboard() {
  const [userId, setUserId] = useState('user-1');
  const { value: hasNewWidget } = usePulseFlag('new_analytics_widget', { userId });

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900 border rounded flex items-center gap-4">
        <label className="font-semibold">Simulate User ID:</label>
        <input 
          type="text" 
          value={userId} 
          onChange={e => setUserId(e.target.value)}
          className="border p-2 rounded"
          data-testid="user-id-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border p-6 rounded-xl bg-white dark:bg-gray-950 shadow-sm h-48 flex items-center justify-center">
          <p className="text-gray-500">Standard Chart</p>
        </div>
        
        {hasNewWidget && (
          <div data-testid="new-widget" className="border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-xl shadow-sm h-48 flex flex-col items-center justify-center">
            <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2">New Predictive Analytics 🚀</h3>
            <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80">You are in the 10% rollout!</p>
          </div>
        )}
      </div>
    </div>
  );
}
