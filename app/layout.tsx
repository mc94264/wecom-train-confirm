import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "企微培训效果确认机器人",
  description: "安全培训效果确认系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
