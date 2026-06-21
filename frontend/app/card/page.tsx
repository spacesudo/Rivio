"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getJwt } from "@/lib/enoki";
import { fetchMe } from "@/lib/api";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { Header } from "@/components/layout/Header";
import { VirtualCard } from "@/components/ui/VirtualCard";
import { BankAccountCard } from "@/components/ui/BankAccountCard";

const TABS = [
  { id: "card", label: "Card" },
  { id: "usd", label: "USD" },
  { id: "gbp", label: "GBP" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function AccountsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("card");
  const [fullName, setFullName] = useState<string | undefined>(undefined);
  const [initials, setInitials] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      const me = await fetchMe(jwt).catch(() => null);
      if (me) {
        const name = [me.first_name, me.last_name].filter(Boolean).join(" ");
        if (name) setFullName(name);
        const i = [me.first_name?.[0], me.last_name?.[0]].filter(Boolean).join("").toUpperCase();
        if (i) setInitials(i);
      }
    })();
  }, [router]);

  return (
    <div className="app-bg flex min-h-screen flex-col pb-28">
      <Header initials={initials} dark />

      <div className="px-6 pb-4 pt-2">
        <h1 className="text-headline text-2xl text-white">Accounts</h1>
        <p className="text-sm text-neutral">Your virtual accounts &amp; card</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 px-6 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-lg"
                : "glass-strong text-neutral hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Card content */}
      <div className="flex-1 px-6">
        {activeTab === "card" && (
          <VirtualCard name={fullName} />
        )}
        {activeTab === "usd" && (
          <div className="space-y-4">
            <BankAccountCard currency="USD" name={fullName} />
            <div className="glass-card rounded-[16px] p-4">
              <p className="text-sm font-medium text-white">Account details</p>
              <p className="text-xs text-white/45 mt-0.5">US dollar virtual account — coming soon</p>
            </div>
          </div>
        )}
        {activeTab === "gbp" && (
          <div className="space-y-4">
            <BankAccountCard currency="GBP" name={fullName} />
            <div className="glass-card rounded-[16px] p-4">
              <p className="text-sm font-medium text-white">Account details</p>
              <p className="text-xs text-white/45 mt-0.5">British pound virtual account — coming soon</p>
            </div>
          </div>
        )}
      </div>

      <FloatingNav />
    </div>
  );
}
