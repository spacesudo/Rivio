"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";

import { getJwt } from "@/lib/enoki";
import { getWalletHistory, type Activity } from "@/lib/api";
import { TxRow, TxRowSkeleton, TxDetailModal } from "@/components/ui/TxRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { FloatingNav } from "@/components/layout/FloatingNav";

export default function HistoryPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [selected, setSelected] = useState<Activity | null>(null);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      const hist = await getWalletHistory(jwt).catch(() => []);
      setActivities(hist);
    })();
  }, [router]);

  return (
    <div className="app-bg flex min-h-screen flex-col pb-28">
      <div className="flex items-center gap-3 px-6 pb-4 pt-safe pt-8">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full glass-strong text-neutral transition-all hover:scale-105"
        >
          <IconArrowLeft size={20} />
        </button>
        <h1 className="text-headline text-xl text-white">Activity</h1>
      </div>

      <div className="flex-1 px-6">
        <div className="glass-card animate-rise rounded-card px-4 py-2">
          {activities === null ? (
            [0, 1, 2, 3, 4].map((i) => <TxRowSkeleton key={i} />)
          ) : activities.length === 0 ? (
            <EmptyState
              message="No transactions yet."
              cta="Make your first transfer"
              onCta={() => router.push("/send")}
            />
          ) : (
            activities.map((a, i) => (
              <div key={a.uid} className={i < activities.length - 1 ? "divider" : ""}>
                <TxRow activity={a} onClick={() => setSelected(a)} />
              </div>
            ))
          )}
        </div>
      </div>

      {selected && (
        <TxDetailModal activity={selected} onClose={() => setSelected(null)} />
      )}

      <FloatingNav />
    </div>
  );
}
