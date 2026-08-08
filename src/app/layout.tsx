import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "دعوة زفاف",
  description: "دعوة زفاف مصممة لتجربة جوال أنيقة.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preload" as="image" href="/wedding-poster.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
