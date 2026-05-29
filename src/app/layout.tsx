import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Toga Automation Dashboard',
  description: 'Medical tourism outreach automation platform',
  icons: {
    icon: 'https://res.cloudinary.com/dhnimveep/image/upload/v1778551521/WhatsApp_Image_2026-05-11_at_1.16.48_PM_w1wshg.jpg',
    shortcut: 'https://res.cloudinary.com/dhnimveep/image/upload/v1778551521/WhatsApp_Image_2026-05-11_at_1.16.48_PM_w1wshg.jpg',
    apple: 'https://res.cloudinary.com/dhnimveep/image/upload/v1778551521/WhatsApp_Image_2026-05-11_at_1.16.48_PM_w1wshg.jpg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
