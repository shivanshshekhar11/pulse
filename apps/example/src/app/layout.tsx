import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PulseProvider } from '@/components/pulse-provider';
import { Navbar } from '@/components/navbar';
import { DemoLab } from '@/components/demo-lab';
import { UserContextProvider } from '@/lib/user-context';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NovaPay — Modern Payments',
  description: 'Live feature flag demo powered by Pulse. Built with @pulse-flags/sdk.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased min-h-screen`}>
        {/*
         * UserContextProvider must wrap PulseProvider so that DemoLab changes
         * propagate to every usePulseFlag call in the tree.
         */}
        <UserContextProvider>
          <PulseProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              {/* Offset right edge to keep content clear of the Demo Lab toggle tab */}
              <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full pr-14">
                {children}
              </main>
            </div>
            {/* Demo Lab is fixed-position — outside the flex flow */}
            <DemoLab />
          </PulseProvider>
        </UserContextProvider>
      </body>
    </html>
  );
}
