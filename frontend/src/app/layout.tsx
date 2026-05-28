import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastContainer } from '@/components/ui/Toast';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '写 — 内容创作工作流',
  description: '面向 Vlog / 口播 / 自媒体的内容创作工作流，AI 辅助写作与审校',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
