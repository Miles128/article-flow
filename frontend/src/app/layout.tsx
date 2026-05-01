import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Article Flow - 自媒体文章全流程工作流管理平台',
  description: '面向内容创作者的网页版自媒体文章全流程工作流管理平台，支持AI辅助写作、多平台格式适配',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
