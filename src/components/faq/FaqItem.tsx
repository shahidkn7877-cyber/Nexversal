import React from "react";
import { FaqItem as FaqItemType } from "@/types/seo";
import { HelpCircle, ChevronRight } from "lucide-react";

interface FaqItemProps {
  faq: FaqItemType;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function FaqItem({ faq, isOpen = false, onToggle }: FaqItemProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left font-bold text-xs text-foreground hover:text-brand-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
          <span>{faq.question}</span>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>
      {isOpen && (
        <p className="text-xs text-muted-foreground leading-relaxed pl-5 pt-1 border-t border-border/50">
          {faq.answer}
        </p>
      )}
    </div>
  );
}
