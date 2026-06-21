"use client";

type BankAccountCardProps = {
  currency: "USD" | "GBP";
  name?: string;
};

const CURRENCY_CONFIG = {
  USD: {
    label: "US Dollar",
    symbol: "$",
    code: "USD",
    accent: "rgba(16,185,129,0.18)",
    circle1: "rgba(16,185,129,0.12)",
    circle2: "rgba(6,95,70,0.5)",
    accentDot: "#10B981",
    network: "USD Account",
  },
  GBP: {
    label: "British Pound",
    symbol: "£",
    code: "GBP",
    accent: "rgba(59,130,246,0.18)",
    circle1: "rgba(59,130,246,0.12)",
    circle2: "rgba(30,64,175,0.5)",
    accentDot: "#3B82F6",
    network: "GBP Account",
  },
};

export function BankAccountCard({ currency, name }: BankAccountCardProps) {
  const cfg = CURRENCY_CONFIG[currency];
  const displayName = (name ?? "Rivio User").toUpperCase();

  return (
    <div
      className="relative overflow-hidden rounded-[20px]"
      style={{
        aspectRatio: "1.586",
        background: "#131318",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
      }}
    >
      {/* Top-right decorative circle */}
      <div
        className="absolute -right-8 -top-8 h-40 w-40 rounded-full"
        style={{ background: cfg.circle2 }}
      />
      {/* Currency symbol chip area */}
      <div
        className="absolute flex items-center justify-center rounded-[8px]"
        style={{
          top: "18px",
          right: "22px",
          width: "38px",
          height: "28px",
          background: cfg.accent,
          border: `1px solid ${cfg.accentDot}30`,
        }}
      >
        <span
          className="text-base font-bold"
          style={{ color: cfg.accentDot }}
        >
          {cfg.symbol}
        </span>
      </div>

      {/* Bottom-center decorative circle */}
      <div
        className="absolute -bottom-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full"
        style={{ background: cfg.circle1 }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        {/* Logo */}
        <p className="text-base font-bold tracking-tight text-white">
          rivio<span style={{ color: "#6C63FF" }}>.</span>
        </p>

        {/* Account number dots */}
        <div className="flex items-center gap-3">
          {[0, 1, 2].map((g) => (
            <span key={g} className="flex gap-1">
              {[0, 1, 2, 3].map((d) => (
                <span
                  key={d}
                  className="inline-block h-[7px] w-[7px] rounded-full"
                  style={{ background: `${cfg.accentDot}60` }}
                />
              ))}
            </span>
          ))}
          <span className="font-mono text-base font-medium tracking-widest text-white/90">
            {currency === "USD" ? "4821" : "2047"}
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
            {displayName}
          </p>
          <p className="text-[11px] font-medium tracking-wide text-white/50">
            {cfg.network}
          </p>
        </div>
      </div>
    </div>
  );
}
