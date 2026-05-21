import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { PulseProvider } from '@/components/pulse-provider';
import { Navbar } from '@/components/navbar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'NovaPay',
  description: 'Example SaaS application using Pulse Feature Flags',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased min-h-screen`}>
        <PulseProvider>
          <Navbar />
          <main className="p-8">
            {children}
          </main>
        </PulseProvider>
      </body>
    </html>
  );
}
