import './shuyuan-mock.css';

export const metadata = {
  title: '书斋墨韵 · 界面 Mock',
  description: 'Article-Flow 古风界面设计稿预览',
};

export default function ShuyuanMockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="shuyuan-mock-root" data-ui-theme="shuyuan">
      {children}
    </div>
  );
}
