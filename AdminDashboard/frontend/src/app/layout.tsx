import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FasalVaidya Admin Dashboard',
  description: 'AI-powered agriculture health monitoring administration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
