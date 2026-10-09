export interface AppConfig {
  appName: string;
  version: string;
  environment: "development" | "production" | "test";
  features: {
    seoAnalyzer: boolean;
    siteCrawler: boolean;
    schemaGenerator: boolean;
    faqGenerator: boolean;
    aiPatterns: boolean;
  };
}

export const config: AppConfig = {
  appName: "AI SEO Optimizer",
  version: "2.0.0-phase1",
  environment: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
  features: {
    seoAnalyzer: true,
    siteCrawler: false,
    schemaGenerator: true,
    faqGenerator: true,
    aiPatterns: true,
  },
};
