import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Codeplane - Cloud Devbox & Ephemeral Development Platform',
  description: 'Build at the speed of thought. Isolated containerized environments, zero-latency clusters, and neural coding agents.',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090e] text-[#ededf5] min-h-screen">
        {children}
      </body>
    </html>
  );
}
