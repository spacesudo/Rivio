"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome2,
  IconCreditCard,
  IconArrowsUpDown,
  IconSparkles,
} from "@tabler/icons-react";

const NAV_ITEMS = [
  { label: "Home", icon: IconHome2, href: "/dashboard" },
  { label: "Card", icon: IconCreditCard, href: "/card" },
  { label: "Swap", icon: IconArrowsUpDown, href: "/swap" },
  { label: "AI", icon: IconSparkles, href: "/ai" },
];

export function FloatingNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto flex max-w-shell justify-center px-6">
      <nav
        className="nav-pill pointer-events-auto flex items-center gap-1 px-2 py-2"
        aria-label="Primary"
      >
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all active:scale-95 ${
                active ? "bg-primary text-white" : "text-neutral hover:text-white"
              }`}
            >
              <Icon size={22} stroke={active ? 2.4 : 2} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
