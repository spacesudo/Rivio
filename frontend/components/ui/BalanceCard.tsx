import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Skeleton } from "./Skeleton";

export function BalanceCard({
  totalUsd,
  usdcBalance,
  changePct,
  loading,
}: {
  totalUsd: string | null;
  usdcBalance: string | null;
  changePct: number | null;
  loading: boolean;
}) {
  const positive = (changePct ?? 0) >= 0;

  return (
    <div className="px-5 pb-6 pt-4">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Total balance</p>
      {loading ? (
        <Skeleton className="mb-2 h-10 w-48" />
      ) : (
        <p className="mb-1 text-4xl font-bold tracking-tight text-white">
          ${totalUsd ?? "—"}
        </p>
      )}
      <div className="flex items-center gap-3">
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <>
            <p className="text-sm text-white/50">
              {usdcBalance ?? "—"} USDC · Sui Network
            </p>
            {changePct != null && (
              <span
                className={`flex items-center gap-0.5 rounded-pill px-2 py-0.5 text-xs font-semibold ${
                  positive ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                }`}
              >
                {positive ? <IconTrendingUp size={11} /> : <IconTrendingDown size={11} />}
                {positive ? "+" : ""}
                {changePct.toFixed(2)}% this week
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
