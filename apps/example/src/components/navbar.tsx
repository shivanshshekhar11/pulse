import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="border-b space-x-4 p-4 flex gap-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <div className="font-bold mr-6">NovaPay</div>
      <Link href="/" className="hover:underline">Home</Link>
      <Link href="/pricing" className="hover:underline">Pricing</Link>
      <Link href="/dashboard" className="hover:underline">Dashboard</Link>
      <Link href="/settings" className="hover:underline">Settings</Link>
    </nav>
  );
}
