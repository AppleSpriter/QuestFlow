import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuestFlow",
  description: "A lightweight progress tracker for long-running quests.",
  icons: {
    icon: "/image.png",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
