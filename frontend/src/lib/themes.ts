export interface ThemeConfig {
  name: string;
  css: string;
  codeTheme: string;
}

export const themes: ThemeConfig[] = [
  {
    name: '橙心',
    codeTheme: 'atom-one-dark',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #ff6600; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #e55a00; margin: 25px 0 15px; padding: 0 0 8px; border-bottom: 2px solid #ff6600; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #cc5500; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #333; line-height: 2; margin: 0 0 16px; text-indent: 0; }
      .preview-content strong { color: #ff6600; font-weight: bold; }
      .preview-content em { font-style: italic; color: #ff6600; }
      .preview-content a { color: #ff6600; text-decoration: none; border-bottom: 1px solid #ff6600; }
      .preview-content blockquote { border-left: 4px solid #ff6600; padding: 10px 16px; margin: 16px 0; background: #fff8f0; color: #666; font-style: italic; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #333; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #fff0e0; color: #ff6600; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #ff6600; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #fff0e0; color: #ff6600; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #333; }
    `
  },
  {
    name: '姹紫',
    codeTheme: 'atom-one-dark',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #8b5cf6; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #7c3aed; margin: 25px 0 15px; padding: 0 0 8px; border-bottom: 2px solid #8b5cf6; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #6d28d9; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #333; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #8b5cf6; font-weight: bold; }
      .preview-content em { font-style: italic; color: #8b5cf6; }
      .preview-content a { color: #8b5cf6; text-decoration: none; border-bottom: 1px solid #8b5cf6; }
      .preview-content blockquote { border-left: 4px solid #8b5cf6; padding: 10px 16px; margin: 16px 0; background: #f5f3ff; color: #666; font-style: italic; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #333; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #f5f3ff; color: #8b5cf6; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #8b5cf6; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #f5f3ff; color: #8b5cf6; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #333; }
    `
  },
  {
    name: '绿意',
    codeTheme: 'atom-one-light',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #16a34a; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #15803d; margin: 25px 0 15px; padding: 0 0 8px; border-bottom: 2px solid #16a34a; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #166534; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #333; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #16a34a; font-weight: bold; }
      .preview-content em { font-style: italic; color: #16a34a; }
      .preview-content a { color: #16a34a; text-decoration: none; border-bottom: 1px solid #16a34a; }
      .preview-content blockquote { border-left: 4px solid #16a34a; padding: 10px 16px; margin: 16px 0; background: #f0fdf4; color: #666; font-style: italic; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #333; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #f0fdf4; color: #16a34a; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #16a34a; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #f0fdf4; color: #16a34a; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #333; }
    `
  },
  {
    name: '红绯',
    codeTheme: 'atom-one-dark',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #dc2626; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #b91c1c; margin: 25px 0 15px; padding: 0 0 8px; border-bottom: 2px solid #dc2626; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #991b1b; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #333; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #dc2626; font-weight: bold; }
      .preview-content em { font-style: italic; color: #dc2626; }
      .preview-content a { color: #dc2626; text-decoration: none; border-bottom: 1px solid #dc2626; }
      .preview-content blockquote { border-left: 4px solid #dc2626; padding: 10px 16px; margin: 16px 0; background: #fef2f2; color: #666; font-style: italic; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #333; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #dc2626; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #fef2f2; color: #dc2626; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #333; }
    `
  },
  {
    name: '极客黑',
    codeTheme: 'monokai',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #111; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #222; margin: 25px 0 15px; padding: 0 0 8px; border-bottom: 2px solid #111; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #333; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #333; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #111; font-weight: bold; }
      .preview-content em { font-style: italic; }
      .preview-content a { color: #111; text-decoration: underline; }
      .preview-content blockquote { border-left: 4px solid #111; padding: 10px 16px; margin: 16px 0; background: #f5f5f5; color: #666; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #333; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #f5f5f5; color: #e74c3c; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #272822; color: #f8f8f2; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #f5f5f5; color: #111; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #333; }
    `
  },
  {
    name: '科技蓝',
    codeTheme: 'vs2015',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #2563eb; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #1d4ed8; margin: 25px 0 15px; padding: 8px 14px; background: #eff6ff; border-radius: 8px; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #2563eb; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #374151; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #ea580c; font-weight: bold; }
      .preview-content em { font-style: italic; color: #2563eb; }
      .preview-content a { color: #2563eb; text-decoration: none; border-bottom: 1px solid #2563eb; }
      .preview-content blockquote { border-left: 4px solid #2563eb; padding: 10px 16px; margin: 16px 0; background: #f0f9ff; color: #64748b; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #374151; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #2563eb; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #eff6ff; color: #2563eb; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #374151; }
    `
  },
  {
    name: '暖调人文',
    codeTheme: 'atom-one-light',
    css: `
      .preview-content { font-family: "PingFang SC", sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #c2410c; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #ea580c; margin: 25px 0 15px; padding: 8px 14px; background: #fff7ed; border-radius: 8px; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #ea580c; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #44403c; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #ea580c; font-weight: bold; }
      .preview-content em { font-style: italic; color: #c2410c; }
      .preview-content a { color: #ea580c; text-decoration: none; border-bottom: 1px solid #ea580c; }
      .preview-content blockquote { border-left: 4px solid #ea580c; padding: 10px 16px; margin: 16px 0; background: #fffbeb; color: #78716c; font-style: italic; border-radius: 0 8px 8px 0; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #44403c; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #fff7ed; color: #c2410c; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #ea580c; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #fff7ed; color: #c2410c; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #44403c; }
    `
  },
  {
    name: '东方雅韵',
    codeTheme: 'atom-one-light',
    css: `
      .preview-content { font-family: "PingFang SC", "SimSun", serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #2f4f4f; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #3d5c5c; margin: 25px 0 15px; padding: 8px 14px; background: #f0ede8; border-radius: 8px; border-left: 4px solid #2f4f4f; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #5f7a7a; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #3e3a36; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #2f4f4f; font-weight: bold; }
      .preview-content em { font-style: italic; color: #8b4513; }
      .preview-content a { color: #2f4f4f; text-decoration: none; border-bottom: 1px solid #2f4f4f; }
      .preview-content blockquote { border-left: 4px solid #8b4513; padding: 10px 16px; margin: 16px 0; background: #faf7f2; color: #8b7355; font-style: italic; border-radius: 0 8px 8px 0; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #3e3a36; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #f0ede8; color: #2f4f4f; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #8b7355; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #f0ede8; color: #2f4f4f; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #3e3a36; }
    `
  },
  {
    name: '薄荷清新',
    codeTheme: 'atom-one-light',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #059669; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #047857; margin: 25px 0 15px; padding: 8px 14px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #059669; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #065f46; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #374151; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #059669; font-weight: bold; }
      .preview-content em { font-style: italic; color: #0d9488; }
      .preview-content a { color: #059669; text-decoration: none; border-bottom: 1px solid #059669; }
      .preview-content blockquote { border-left: 4px solid #0d9488; padding: 10px 16px; margin: 16px 0; background: #f0fdfa; color: #6b7280; font-style: italic; border-radius: 0 8px 8px 0; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #374151; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #ecfdf5; color: #059669; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #0d9488; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #ecfdf5; color: #059669; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #374151; }
    `
  },
  {
    name: '樱花粉黛',
    codeTheme: 'atom-one-light',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #db2777; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #be185d; margin: 25px 0 15px; padding: 8px 14px; background: #fdf2f8; border-radius: 8px; border-left: 4px solid #db2777; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #9d174d; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #44403c; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #db2777; font-weight: bold; }
      .preview-content em { font-style: italic; color: #be185d; }
      .preview-content a { color: #db2777; text-decoration: none; border-bottom: 1px solid #db2777; }
      .preview-content blockquote { border-left: 4px solid #db2777; padding: 10px 16px; margin: 16px 0; background: #fdf2f8; color: #78716c; font-style: italic; border-radius: 0 8px 8px 0; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #44403c; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #fdf2f8; color: #db2777; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #db2777; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #fdf2f8; color: #db2777; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #44403c; }
    `
  },
  {
    name: '深海蓝调',
    codeTheme: 'monokai',
    css: `
      .preview-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #1e40af; text-align: center; margin: 30px 0 20px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #1e3a8a; margin: 25px 0 15px; padding: 8px 14px; background: #eff6ff; border-radius: 8px; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #1e40af; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #334155; line-height: 2; margin: 0 0 16px; }
      .preview-content strong { color: #1e40af; font-weight: bold; }
      .preview-content em { font-style: italic; color: #7c3aed; }
      .preview-content a { color: #1e40af; text-decoration: none; border-bottom: 1px solid #1e40af; }
      .preview-content blockquote { border-left: 4px solid #1e40af; padding: 10px 16px; margin: 16px 0; background: #f0f9ff; color: #64748b; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #334155; line-height: 2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #eff6ff; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px dashed #1e40af; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #eff6ff; color: #1e40af; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #334155; }
    `
  },
  {
    name: '墨香书韵',
    codeTheme: 'atom-one-light',
    css: `
      .preview-content { font-family: "SimSun", "STSong", "Noto Serif SC", serif; }
      .preview-content h1 { font-size: 20pt; font-weight: bold; color: #1c1917; text-align: center; margin: 30px 0 20px; letter-spacing: 2px; }
      .preview-content h2 { font-size: 17pt; font-weight: bold; color: #292524; margin: 25px 0 15px; padding: 8px 14px; background: #fafaf9; border-radius: 4px; border-left: 4px solid #78716c; }
      .preview-content h3 { font-size: 14pt; font-weight: bold; color: #44403c; margin: 20px 0 10px; }
      .preview-content p { font-size: 15px; color: #292524; line-height: 2.2; margin: 0 0 18px; text-indent: 2em; }
      .preview-content strong { color: #1c1917; font-weight: bold; }
      .preview-content em { font-style: italic; color: #78716c; }
      .preview-content a { color: #78716c; text-decoration: underline; }
      .preview-content blockquote { border-left: 4px solid #d6d3d1; padding: 12px 18px; margin: 16px 0; background: #f5f5f4; color: #78716c; font-style: italic; }
      .preview-content ul, .preview-content ol { padding-left: 2em; margin: 10px 0; color: #292524; line-height: 2.2; }
      .preview-content li { margin-bottom: 6px; }
      .preview-content code { background: #f5f5f4; color: #1c1917; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: Consolas, Monaco, monospace; }
      .preview-content pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; line-height: 1.6; }
      .preview-content pre code { background: none; color: inherit; padding: 0; }
      .preview-content img { max-width: 100%; border-radius: 4px; margin: 16px 0; }
      .preview-content hr { border: none; border-top: 1px solid #d6d3d1; margin: 24px 0; }
      .preview-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      .preview-content th { background: #f5f5f4; color: #1c1917; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
      .preview-content td { padding: 10px; border: 1px solid #e5e7eb; color: #292524; }
    `
  },
];

export const codeThemes: Record<string, string> = {
  'atom-one-dark': `
    .hljs { background: #282c34; color: #abb2bf; }
    .hljs-comment, .hljs-quote { color: #5c6370; font-style: italic; }
    .hljs-doctag, .hljs-keyword, .hljs-formula { color: #c678dd; }
    .hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst { color: #e06c75; }
    .hljs-literal { color: #56b6c2; }
    .hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta .hljs-string { color: #98c379; }
    .hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number { color: #d19a66; }
    .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id, .hljs-title { color: #61aeee; }
    .hljs-built_in, .hljs-title.class_, .hljs-class .hljs-title { color: #e6c07b; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: bold; }
    .hljs-link { text-decoration: underline; }
  `,
  'atom-one-light': `
    .hljs { background: #fafafa; color: #383a42; }
    .hljs-comment, .hljs-quote { color: #a0a1a7; font-style: italic; }
    .hljs-doctag, .hljs-keyword, .hljs-formula { color: #a626a4; }
    .hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst { color: #e45649; }
    .hljs-literal { color: #0184bb; }
    .hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta .hljs-string { color: #50a14f; }
    .hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number { color: #986801; }
    .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id, .hljs-title { color: #4078f2; }
    .hljs-built_in, .hljs-title.class_, .hljs-class .hljs-title { color: #c18401; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: bold; }
    .hljs-link { text-decoration: underline; }
  `,
  'monokai': `
    .hljs { background: #272822; color: #f8f8f2; }
    .hljs-comment, .hljs-quote { color: #75715e; }
    .hljs-keyword, .hljs-selector-tag, .hljs-section { color: #f92672; }
    .hljs-string, .hljs-addition { color: #a6e22e; }
    .hljs-literal, .hljs-number { color: #ae81ff; }
    .hljs-title, .hljs-name, .hljs-type { color: #f8f8f2; }
    .hljs-attr, .hljs-variable, .hljs-template-variable { color: #fd971f; }
    .hljs-built_in { color: #66d9ef; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: bold; }
  `,
  'vs2015': `
    .hljs { background: #1e1e1e; color: #d4d4d4; }
    .hljs-keyword { color: #569cd6; }
    .hljs-string { color: #ce9178; }
    .hljs-number { color: #b5cea8; }
    .hljs-comment { color: #6a9955; }
    .hljs-function .hljs-title { color: #dcdcaa; }
    .hljs-built_in { color: #4ec9b0; }
    .hljs-type { color: #4ec9b0; }
    .hljs-attr { color: #9cdcfe; }
    .hljs-variable { color: #9cdcfe; }
    .hljs-literal { color: #569cd6; }
    .hljs-meta { color: #569cd6; }
    .hljs-selector-class { color: #d7ba7d; }
    .hljs-selector-tag { color: #569cd6; }
  `,
};

export function getThemeByName(name: string): ThemeConfig {
  return themes.find(t => t.name === name) || themes[0];
}
