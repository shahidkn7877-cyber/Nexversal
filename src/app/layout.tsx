import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI SEO Optimizer Pro — Content Architecture & Optimization",
  description:
    "Professional SEO platform for content auditing, keyword optimization, and search visibility.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
