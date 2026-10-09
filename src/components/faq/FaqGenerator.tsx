"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Copy, Sparkles, Check } from "lucide-react";
import { FaqItem } from "./FaqItem";
import { FaqItem as FaqItemType } from "@/types/seo";

interface FaqGeneratorProps {
  topic?: string;
}

export function FaqGenerator({ topic }: FaqGeneratorProps) {
  const [openId, setOpenId] = useState<string | null>("1");
  const [copied, setCopied] = useState(false);

  const demoFaqs: FaqItemType[] = [
    {
      id: "1",
      question: "How does heading hierarchy impact on-page SEO ranking factors?",
      answer:
        "A clear H1-H2-H3 hierarchy helps search engine crawlers understand topical depth and improves scannability for both users and assistive technologies.",
    },
    {
      id: "2",
      question: "What is the recommended keyword density for SEO content?",
      answer:
        "For Google Helpful Content guidelines, an optimal keyword density typically ranges between 0.8% and 2.0% naturally distributed throughout the body and subheadings.",
    },
    {
      id: "3",
      question: "Why should paragraphs stay under 80 words for mobile users?",
      answer:
        "Short 2-to-3 sentence paragraphs maximize mobile scannability, reduce bounce rates, and improve overall content engagement on handheld displays.",
    },
  ];

  const handleCopyFaqs = () => {
    const text = demoFaqs
      .map((f) => `### ${f.question}\n\n${f.answer}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Frequently Asked Questions (FAQ) Generator
            </CardTitle>
          </div>
          <Badge variant="muted">Schema Ready</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <p className="text-muted-foreground">
            Structured FAQs increase rich snippet opportunities in search engine results.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyFaqs}
              className="text-xs h-8 gap-1.5"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied!" : "Copy FAQs"}</span>
            </Button>
            <Button size="sm" variant="default" disabled className="text-xs h-8 gap-1.5">
              <Sparkles className="h-3 w-3" />
              <span>Auto-Generate</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {demoFaqs.map((faq) => (
            <FaqItem
              key={faq.id}
              faq={faq}
              isOpen={openId === faq.id}
              onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
