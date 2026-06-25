"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { IconChevronDown } from "@tabler/icons-react";

export type Token = {
  symbol: string;
  type: string;
  scalar: number;
};

const TOKEN_LOGOS: Record<string, string> = {
  SUI: "/sui.png",
  USDC: "/usdc.png",
};

function TokenLogo({ symbol }: { symbol: string }) {
  const logo = TOKEN_LOGOS[symbol.toUpperCase()];
  return logo ? (
    <Image src={logo} alt={symbol} width={20} height={20} className="rounded-full object-cover" />
  ) : (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6C63FF]/30 text-[9px] font-bold text-violet-soft">
      {symbol.slice(0, 2)}
    </span>
  );
}

export function TokenSelector({
  tokens,
  value,
  onChange,
}: {
  tokens: Token[];
  value: string;
  onChange: (symbol: string) => void;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass flex cursor-pointer items-center gap-2 rounded-pill px-3 py-2 text-sm font-semibold text-white outline-none"
      >
        <TokenLogo symbol={value} />
        <span>{value}</span>
        <IconChevronDown
          size={14}
          className={`text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[120px] overflow-hidden rounded-2xl border border-white/10 bg-[#15131F] shadow-xl">
          {tokens.map((t) => (
            <button
              key={t.symbol}
              type="button"
              onClick={() => { onChange(t.symbol); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.07] ${
                t.symbol === value ? "text-violet-soft" : "text-white"
              }`}
            >
              <TokenLogo symbol={t.symbol} />
              {t.symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
