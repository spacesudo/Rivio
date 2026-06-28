"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowUp,
  IconArrowDown,
  IconArrowsLeftRight,
  IconBuildingBank,
  IconCreditCardPay,
} from "@tabler/icons-react";

import { getJwt } from "@/lib/enoki";
import { createOnrampWidget } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

type Action = { label: string; icon: React.ReactNode; href: string | null; accent?: boolean };

const ACTIONS: Action[] = [
  { label: "Buy", icon: <IconCreditCardPay size={20} />, href: null, accent: true },
  { label: "Send", icon: <IconArrowUp size={20} />, href: "/send" },
  { label: "Receive", icon: <IconArrowDown size={20} />, href: "/receive" },
  { label: "Swap", icon: <IconArrowsLeftRight size={20} />, href: "/swap" },
  { label: "Borrow", icon: <IconBuildingBank size={20} />, href: "/borrow" },
];

export function ActionBar() {
  const router = useRouter();
  const { toast } = useToast();
  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    setBuying(true);
    try {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Not signed in.");
      const { widget_url } = await createOnrampWidget(jwt, { crypto_currency_code: "USDC", network: "sui" });
      window.open(widget_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not open the buy widget.", "error");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="glass-card flex items-center justify-around p-4">
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => (a.href ? router.push(a.href) : handleBuy())}
            disabled={a.label === "Buy" && buying}
            className="flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
                a.accent
                  ? "bg-primary text-white hover:opacity-90"
                  : "glass-strong text-white hover:bg-white/10"
              }`}
            >
              {a.label === "Buy" && buying ? <Spinner size={16} /> : a.icon}
            </div>
            <span className={`text-caption ${
              a.accent ? "text-primary" : "text-neutral"
            }`}>
              {a.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
