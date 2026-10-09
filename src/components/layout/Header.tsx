"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  FileSearch,
  LayoutDashboard,
  Network,
  BarChart3,
  Settings,
  LogIn,
  LogOut,
  User as UserIcon,
  Shield,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {}

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
}

export function Header({}: HeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/v1/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json.authenticated && json.data?.user) {
            setUser(json.data.user);
          } else {
            setUser(null);
          }
          setLoadingAuth(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoadingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark");
    }
  };

  interface NavLinkItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  const navLinks: NavLinkItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/analyzer", label: "Content Analyzer", icon: FileSearch },
    { href: "/crawler", label: "Live SEO Audit", icon: Network },
    { href: "/keywords", label: "Keyword Explorer", icon: KeyRound },
    { href: "/reports", label: "Audit Reports", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 via-brand-600 to-purple-600 text-white shadow-md shadow-rose-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-foreground">
                  Nexversal
                </span>
                <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Professional SEO Platform · Content & Technical Suite
              </p>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-100 text-foreground dark:bg-slate-800"
                    : "text-muted-foreground hover:text-foreground hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <Badge variant="muted" className="text-[9px] py-0 px-1.5 font-bold">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* User Auth Controls */}
          {!loadingAuth && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  {user.role === "ADMIN" && (
                    <Link href="/admin">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold gap-1.5 h-8 border-brand-500/30 text-brand-600 dark:text-brand-400 hidden sm:flex"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>Admin</span>
                      </Button>
                    </Link>
                  )}

                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-border">
                    <div className="h-6 w-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-foreground max-w-[100px] truncate hidden lg:inline">
                      {user.name || user.email.split("@")[0]}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                      title="Sign Out"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Link href="/login">
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs font-bold gap-1.5 h-8"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl text-muted-foreground hover:text-foreground"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  isActive
                    ? "bg-slate-100 dark:bg-slate-800 text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="muted" className="text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/30"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </div>
              <Badge variant="default" className="text-[10px]">
                ADMIN
              </Badge>
            </Link>
          )}

          <div className="pt-2 border-t border-border">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">
                    {user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-xs text-rose-500 hover:text-rose-600 h-8"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full block"
              >
                <Button size="sm" className="w-full text-xs font-bold gap-1.5">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}