import Image from "next/image";
import { Skeleton } from "./Skeleton";

export type AssetRowData = {
  symbol: string;
  balance: string;
  usd_value: string | null;
  change_pct?: number | null;
};

const TOKEN_LOGOS: Record<string, string> = {
  SUI: "/sui.png",
  USDC: "/usdc.png",
};

export function AssetRow({ asset }: { asset: AssetRowData }) {
  const changePositive = (asset.change_pct ?? 0) >= 0;
  const logo = TOKEN_LOGOS[asset.symbol.toUpperCase()];
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-[#6C63FF]/20" style={{ border: "0.5px solid rgba(108,99,255,0.35)" }}>
          {logo ? (
            <Image src={logo} alt={asset.symbol} width={40} height={40} className="rounded-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-violet-soft">
              {asset.symbol.replace("$", "").slice(0, 2)}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{asset.symbol}</p>
          <p className="text-xs text-white/45">{asset.balance}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-white">
          {asset.usd_value != null ? `$${asset.usd_value}` : "—"}
        </p>
        {asset.change_pct != null && (
          <p className={`text-xs font-medium ${changePositive ? "text-emerald-400" : "text-red-400"}`}>
            {changePositive ? "+" : ""}
            {asset.change_pct.toFixed(2)}%
          </p>
        )}
      </div>
    </div>
  );
}

export function AssetRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
      <div className="space-y-1.5 text-right">
        <Skeleton className="ml-auto h-3.5 w-14" />
        <Skeleton className="ml-auto h-3 w-10" />
      </div>
    </div>
  );
}
