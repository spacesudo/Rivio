"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  IconHome2, 
  IconWallet, 
  IconSparkles, 
  IconUser, 
  IconX,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconArrowLeft,
  IconArrowRight
} from "@tabler/icons-react";

const NAV_ITEMS = [
  { label: "Home", icon: IconHome2, href: "/dashboard" },
  { label: "Accounts", icon: IconWallet, href: "/card" },
  { label: "AI", icon: IconSparkles, href: "/ai" },
  { label: "Profile", icon: IconUser, href: "/profile" },
];

const THEME_OPTIONS = [
  { label: "Light", icon: IconSun, value: "light" },
  { label: "Dark", icon: IconMoon, value: "dark" },
  { label: "System", icon: IconDeviceDesktop, value: "system" },
];

export function FloatingNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const onThemeChange = setTheme;
  const [expanded, setExpanded] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("navSide");
    if (saved === "left" || saved === "right") setSide(saved);
  }, []);

  const toggleSide = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSide((prev) => {
      const next = prev === "right" ? "left" : "right";
      localStorage.setItem("navSide", next);
      return next;
    });
  }, []);

  const handleExpand = useCallback(() => {
    setExpanded(true);
    setShowThemeMenu(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setExpanded(false);
      setShowThemeMenu(false);
    }, 5000);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
    setShowThemeMenu(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const toggleThemeMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowThemeMenu(!showThemeMenu);
  }, [showThemeMenu]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    handleClose();
  }, [pathname, handleClose]);

  const alignClass = side === "right" ? "justify-end" : "justify-start";
  const itemsClass = side === "right" ? "items-end right-0" : "items-start left-0";

  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto flex max-w-shell px-6 ${alignClass}`}>
      <div className="pointer-events-auto relative">
      {/* Expanded menu items */}
      {expanded && (
        <div className={`absolute bottom-16 flex flex-col gap-3 animate-rise ${itemsClass}`} role="menu" aria-label="Navigation">
          {/* Theme selector */}
          <div className={`flex flex-col gap-2 ${side === "right" ? "items-end" : "items-start"}`}>
            {showThemeMenu && (
              <div className={`flex flex-col gap-2 animate-rise ${side === "right" ? "items-end" : "items-start"}`}>
                {THEME_OPTIONS.map(({ label, icon: Icon, value }) => (
                  <button
                    key={value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onThemeChange(value as "light" | "dark" | "system");
                      setShowThemeMenu(false);
                    }}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 glass-strong transition-all hover:scale-105 ${
                      theme === value ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <Icon size={16} className="text-neutral" />
                    <span className="text-caption text-neutral">{label}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={toggleThemeMenu}
              aria-expanded={showThemeMenu}
              aria-label="Change theme"
              className="flex items-center gap-2 rounded-full px-4 py-2 glass-accent transition-all hover:scale-105"
            >
              {theme === 'light' && <IconSun size={16} className="text-primary" />}
              {theme === 'dark' && <IconMoon size={16} className="text-primary" />}
              {theme === 'system' && <IconDeviceDesktop size={16} className="text-primary" />}
              <span className="text-caption text-primary">Theme</span>
            </button>
            <button
              type="button"
              onClick={toggleSide}
              aria-label={`Move navigation to ${side === "right" ? "left" : "right"}`}
              className="flex items-center gap-2 rounded-full px-4 py-2 glass-strong transition-all hover:scale-105"
            >
              {side === "right"
                ? <IconArrowLeft size={16} className="text-neutral" />
                : <IconArrowRight size={16} className="text-neutral" />}
              <span className="text-caption text-neutral">Move {side === "right" ? "left" : "right"}</span>
            </button>
          </div>

          {/* Navigation items */}
          {NAV_ITEMS.map(({ label, icon: Icon, href }, index) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={handleClose}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-3 transition-all hover:scale-105 animate-rise ${
                  active ? 'glass-accent ring-1 ring-primary' : 'glass-strong'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon 
                  size={20} 
                  className={active ? "text-primary" : "text-neutral"} 
                />
                <span className={`text-sm font-medium ${
                  active ? "text-primary" : "text-neutral"
                }`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Main FAB button */}
      <button
        type="button"
        onClick={expanded ? handleClose : handleExpand}
        aria-label={expanded ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={expanded}
        aria-haspopup="menu"
        className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
      >
        {/* Glow effect */}
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/30 blur-xl" />

        {/* Ripple effect */}
        {!expanded && (
          <div className="pointer-events-none absolute inset-0 rounded-full bg-white/20 animate-ping" />
        )}

        <span className="relative grid place-items-center text-white">
          <IconHome2
            size={24}
            className={`col-start-1 row-start-1 transition-all duration-300 ${
              expanded ? "scale-50 opacity-0" : "scale-100 opacity-100"
            }`}
          />
          <IconX
            size={24}
            className={`col-start-1 row-start-1 transition-all duration-300 ${
              expanded ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          />
        </span>
      </button>
      </div>

      {/* Backdrop */}
      {expanded && (
        <div
          className="pointer-events-auto fixed inset-0 -z-10 bg-black/20 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}
    </div>
  );
}
