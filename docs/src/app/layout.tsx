import type { Metadata } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Beboa Documentation',
  description: 'Comprehensive documentation for Beboa - an AI-powered Discord companion bot',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${sourceCodePro.variable} font-sans`}>
        <ThemeProvider>
          <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-200">
            {/* Header - Full Width */}
            <Header />

            {/* Layout: Sidebar + Main Content */}
            <div className="flex">
              {/* Desktop Sidebar - Fixed below header */}
              <Sidebar />

              {/* Main Content Area */}
              <main className="flex-1 min-w-0 lg:pl-[var(--sidebar-width)]">
                <div className="max-w-[var(--content-max-width)] mx-auto px-6 py-8 lg:px-8 lg:py-12">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
