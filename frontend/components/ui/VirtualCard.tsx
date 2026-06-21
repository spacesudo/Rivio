"use client";

import { useState } from "react";
import { IconSnowflake } from "@tabler/icons-react";
import { MOCK_CARD } from "@/lib/mock";

export function VirtualCard({ name }: { name?: string }) {
  const [frozen, setFrozen] = useState(false);
  const displayName = (name ?? MOCK_CARD.name).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Card face */}
      <div
        className={`animate-rise relative overflow-hidden rounded-[20px] transition-opacity duration-300 ${frozen ? "opacity-60" : ""}`}
        style={{
          aspectRatio: "1.586",
          background: "#131318",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
        }}
      >
        {/* Top-right large circle */}
        <div
          className="absolute -right-8 -top-8 h-40 w-40 rounded-full"
          style={{ background: "rgba(30,28,58,0.9)" }}
        />
        {/* Chip placeholder inside top circle */}
        <div
          className="absolute rounded-[6px]"
          style={{
            top: "18px",
            right: "22px",
            width: "34px",
            height: "26px",
            background: "rgba(80,76,120,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {/* Bottom-center large circle */}
        <div
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full"
          style={{ background: "rgba(25,23,50,0.85)" }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-6">
          {/* Logo */}
          <p className="text-base font-bold tracking-tight text-white">
            rivio<span style={{ color: "#6C63FF" }}>.</span>
          </p>

          {/* Card number */}
          <div className="flex items-center gap-3">
            {[0, 1, 2].map((g) => (
              <span key={g} className="flex gap-1">
                {[0, 1, 2, 3].map((d) => (
                  <span
                    key={d}
                    className="inline-block h-[7px] w-[7px] rounded-full bg-white/50"
                  />
                ))}
              </span>
            ))}
            <span className="font-mono text-base font-medium tracking-widest text-white/90">
              7731
            </span>
          </div>

          {/* Bottom row */}
          <div className="flex items-end justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
              {displayName}
            </p>
            <div className="flex flex-col items-end gap-1">
              {/* Mastercard logo */}
              <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
                <circle cx="14" cy="12" r="11" fill="#EB001B" fillOpacity="0.9" />
                <circle cx="24" cy="12" r="11" fill="#F79E1B" fillOpacity="0.9" />
                <path
                  d="M19 4.8a11 11 0 0 1 0 14.4A11 11 0 0 1 19 4.8z"
                  fill="#FF5F00"
                  fillOpacity="0.95"
                />
              </svg>
              <p className="text-[10px] font-medium tracking-wide text-white/40">
                Sui Network
              </p>
            </div>
          </div>
        </div>

        {frozen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <IconSnowflake size={14} />
              Card frozen
            </div>
          </div>
        )}
      </div>

      {/* Freeze toggle */}
      <div className="glass-card flex items-center justify-between rounded-[16px] p-4">
        <div>
          <p className="text-sm font-medium text-white">Freeze card</p>
          <p className="text-xs text-white/45">Temporarily block all transactions</p>
        </div>
        <button
          onClick={() => setFrozen((f) => !f)}
          aria-label={frozen ? "Unfreeze card" : "Freeze card"}
          className={`relative h-6 w-11 rounded-full transition-colors ${frozen ? "bg-primary" : "bg-white/15"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${frozen ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>

      {/* Physical card upsell */}
      <div className="glass-card flex items-center justify-between rounded-[16px] p-4">
        <div>
          <p className="text-sm font-medium text-white">Physical card</p>
          <p className="text-xs text-white/45">Ship a Rivio debit card to you</p>
        </div>
        <span className="glass-accent rounded-full px-2.5 py-0.5 text-xs font-medium text-violet-soft">
          Coming soon
        </span>
      </div>
    </div>
  );
}
