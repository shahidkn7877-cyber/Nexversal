import type { Metadata } from "next";
import { APP_NAME, APP_DESCRIPTION, SITE_URL } from "@/lib/constants";
import "./globals.css";

function getMetadataBase(): URL {
  try {
    return new URL(SITE_URL);
  } catch {
    return new URL('https://nexversal.bond');
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: `Professional SEO Audit & Content Optimization | ${APP_NAME}`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: `Professional SEO Audit & Content Optimization | ${APP_NAME}`,
    description: APP_DESCRIPTION,
    url: SITE_URL,
    siteName: APP_NAME,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Professional SEO Audit & Content Optimization | ${APP_NAME}`,
    description: APP_DESCRIPTION,
  },
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
