import type { Metadata } from "next";
import Script from "next/script";
import { APP_NAME, APP_DESCRIPTION, SITE_URL } from "@/lib/constants";
import { AuthProvider } from "@/lib/auth/auth-context";
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
        <AuthProvider>{children}</AuthProvider>
        <Script
          src="https://agents.dante-ai.com/embed.js"
          data-agent-id="c112ed98-2a48-4ed4-8284-a69d6013cb53"
          data-widget-key="wk_H-x7n7Sx6BRPdrjyustZELe_MLcgRpVN"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
