import React from "react";
import Link from "next/link";
import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  title?: string;
  description?: string;
}

export function DashboardHeader({
  title = "Nexversal — SEO & Content Optimization Platform",
  description = "Unified workspace to audit live web pages, refine article structure and readability, explore keyword search intent, and generate client-ready SEO reports.",
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <Link href="/analyzer">
          <Button className="gap-2 shadow-sm font-bold text-xs sm:text-sm">
            <FileSearch className="h-4 w-4" />
            <span>Open Content Analyzer</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
