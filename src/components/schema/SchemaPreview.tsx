"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Copy, Check } from "lucide-react";

interface SchemaPreviewProps {
  title?: string;
  url?: string;
}

export function SchemaPreview({
  title = "Comprehensive Technical SEO Guide",
  url = "https://yourwebsite.com/technical-seo-guide",
}: SchemaPreviewProps) {
  const [copied, setCopied] = useState(false);

  const demoSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description:
      "A complete guide to technical SEO auditing, core web vitals, and search engine optimization best practices.",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@type": "Organization",
      name: "SEO Editorial Team",
    },
    publisher: {
      "@type": "Organization",
      name: "AI SEO Optimizer Pro",
      logo: {
        "@type": "ImageObject",
        url: "https://yourwebsite.com/logo.png",
      },
    },
    datePublished: "2026-09-28T00:00:00+00:00",
    dateModified: "2026-09-28T12:00:00+00:00",
  };

  const jsonString = JSON.stringify(demoSchema, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              JSON-LD Structured Data Schema
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">Article Schema</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="text-xs h-7 gap-1"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              <span>{copied ? "Copied" : "Copy Schema"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Insert this code block into your webpage head to provide structured rich data for Google search crawlers:
        </p>
        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed max-h-80 border border-slate-800">
          {`<script type="application/ld+json">\n${jsonString}\n</script>`}
        </pre>
      </CardContent>
    </Card>
  );
}
