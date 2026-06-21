"use client";

import { IconChevronDown } from "@tabler/icons-react";

export type Token = {
  symbol: string;
  type: string;
  scalar: number;
};

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
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass cursor-pointer appearance-none rounded-pill px-4 py-2 pr-9 text-sm font-semibold text-white outline-none"
      >
        {tokens.map((t) => (
          <option key={t.symbol} value={t.symbol} className="bg-[#15131F] text-white">
            {t.symbol}
          </option>
        ))}
      </select>
      <IconChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
      />
    </div>
  );
}
