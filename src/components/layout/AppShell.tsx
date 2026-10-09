"use client";

import React from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export function AppShell({
  children,
  showSidebar = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      <Header />
      <div className="flex-1 flex w-full">
        {showSidebar && <Sidebar />}
        <main className="flex-1 flex flex-col w-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
