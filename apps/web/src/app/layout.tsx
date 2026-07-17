import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 八字命术 · 规则排盘 + AI 解读',
  description:
    '由确定性规则引擎排盘，大模型翻译为通俗解读。文化娱乐用途，不构成任何专业建议。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
