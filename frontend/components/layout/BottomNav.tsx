"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IconHome2, IconWallet, IconSparkles, IconUser } from "@tabler/icons-react";

const TABS = [
  { label: "Home", icon: IconHome2, href: "/dashboard" },
  { label: "Accounts", icon: IconWallet, href: "/card" },
  { label: "AI", icon: IconSparkles, href: "/ai" },
  { label: "Profile", icon: IconUser, href: "/profile" },
];

const COLLAPSE_DELAY = 3000;

export function BottomNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCollapse = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setExpanded(false), COLLAPSE_DELAY);
  }, []);

  const expand = useCallback(() => {
    setExpanded(true);
    scheduleCollapse();
  }, [scheduleCollapse]);

  useEffect(() => {
    scheduleCollapse();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [scheduleCollapse]);

  useEffect(() => {
    expand();
  }, [pathname, expand]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex max-w-shell justify-center px-6 pb-6">
      <div
        onClick={expanded ? undefined : expand}
        className="nav-pill flex items-center justify-around px-6 py-4 transition-all duration-500 ease-out"
        style={{ width: expanded ? "100%" : "auto", gap: expanded ? undefined : "12px" }}
      >
        {TABS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={expand}
              className="flex flex-col items-center gap-2 transition-all duration-300"
            >
              <div
                className={`flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  active 
                    ? "bg-gradient-to-br from-primary/20 to-primary/30 shadow-lg" 
                    : "glass-strong hover:bg-white/10"
                } ${expanded ? "h-11 w-11" : "h-10 w-10"}`}
              >
                <Icon
                  size={expanded ? 22 : 20}
                  stroke={active ? 2.5 : 2}
                  className={`transition-all duration-300 ${
                    active ? "text-primary" : "text-neutral"
                  }`}
                />
              </div>
              <span
                className={`overflow-hidden text-caption font-semibold tracking-wide transition-all duration-300 ${
                  active ? "text-primary" : "text-neutral"
                } ${expanded ? "max-h-5 opacity-100" : "max-h-0 opacity-0"}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
