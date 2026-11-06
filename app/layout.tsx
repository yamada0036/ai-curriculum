import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人工智能专业 · 课程管理",
  description: "2025版培养方案课程设置与教学安排管理系统",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
