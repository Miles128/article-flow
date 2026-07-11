import type { Metadata } from 'next';
import { ToastContainer } from '@/components/ui/Toast';
import { appearanceBootstrapScript } from '@/components/theme/AppearanceBootstrap';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { DEFAULT_ARTICLE_FONT, DEFAULT_UI_FONT } from '@/lib/uiFonts';
import { DEFAULT_UI_THEME } from '@/lib/uiThemes';
import '@/styles/globals.css';

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
    <html
      lang="zh-CN"
      data-ui-theme={DEFAULT_UI_THEME}
      data-color-scheme="light"
      data-ui-font={DEFAULT_UI_FONT}
      data-article-font={DEFAULT_ARTICLE_FONT}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: appearanceBootstrapScript() }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
