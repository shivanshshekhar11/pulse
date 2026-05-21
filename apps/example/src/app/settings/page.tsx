'use client';
import { useState } from 'react';
import { usePulseFlag } from '@/lib/hooks';

export default function Settings() {
  const [email, setEmail] = useState('employee@company.com');
  // Pass email for segment targeting testing
  const { value: canExport } = usePulseFlag('beta_export_feature', { userId: '123', email });

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
      
      <div className="space-y-6">
        <div className="p-6 border rounded-xl bg-white dark:bg-gray-950">
          <label className="block text-sm font-medium mb-2">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border p-2 rounded"
            data-testid="email-input"
          />
          <p className="text-sm text-gray-500 mt-2">Change email to test segment targeting.</p>
        </div>

        {canExport && (
          <div data-testid="export-feature" className="p-6 border border-green-500 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <h3 className="font-bold text-green-800 dark:text-green-400 mb-2">Data Export (Beta)</h3>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
              Export All Data as CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
