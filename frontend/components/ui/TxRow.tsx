"use client";

import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsLeftRight,
  IconBuildingBank,
  IconExternalLink,
} from "@tabler/icons-react";
import { Skeleton } from "./Skeleton";
import type { Activity, ActivityKind } from "@/lib/api";

const ICON_MAP: Record<ActivityKind, React.ReactNode> = {
  send: <IconArrowUp size={16} />,
  receive: <IconArrowDown size={16} />,
  deposit: <IconArrowDown size={16} />,
  withdraw: <IconArrowUp size={16} />,
  swap: <IconArrowsLeftRight size={16} />,
  borrow: <IconBuildingBank size={16} />,
  repay: <IconBuildingBank size={16} />,
};

const COLOR_MAP: Record<ActivityKind, string> = {
  send: "bg-red-500/15 text-red-300",
  receive: "bg-emerald-500/15 text-emerald-300",
  deposit: "bg-emerald-500/15 text-emerald-300",
  withdraw: "bg-amber-500/15 text-amber-300",
  swap: "bg-[#6C63FF]/20 text-violet-soft",
  borrow: "bg-[#6C63FF]/20 text-violet-soft",
  repay: "bg-emerald-500/15 text-emerald-300",
};

const SIGN_MAP: Record<ActivityKind, string> = {
  send: "-",
  receive: "+",
  deposit: "+",
  withdraw: "-",
  swap: "~",
  borrow: "+",
  repay: "-",
};

function formatAmount(amount: number, asset: string): string {
  const scalar = asset.includes("USDC") ? 1_000_000 : 1_000_000_000;
  const human = amount / scalar;
  return human.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function TxRow({
  activity,
  onClick,
}: {
  activity: Activity;
  onClick?: () => void;
}) {
  const icon = ICON_MAP[activity.kind];
  const color = COLOR_MAP[activity.kind];
  const sign = SIGN_MAP[activity.kind];

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium capitalize text-white">{activity.kind}</p>
          <p className="text-xs text-white/45">
            {activity.counterparty
              ? activity.counterparty.length > 16
                ? activity.counterparty.slice(0, 8) + "…" + activity.counterparty.slice(-4)
                : activity.counterparty
              : "—"}{" "}
            · {relativeTime(activity.created_at)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${sign === "+" ? "text-emerald-300" : sign === "-" ? "text-white" : "text-violet-soft"}`}>
          {sign}
          {formatAmount(activity.amount, activity.asset)} {activity.asset.split("→")[0]}
        </p>
        <p className={`text-xs capitalize ${activity.status === "executed" ? "text-emerald-400" : activity.status === "failed" ? "text-red-400" : "text-white/45"}`}>
          {activity.status}
        </p>
      </div>
    </button>
  );
}

export function TxRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="space-y-1.5 text-right">
        <Skeleton className="ml-auto h-3.5 w-16" />
        <Skeleton className="ml-auto h-3 w-10" />
      </div>
    </div>
  );
}

export function TxDetailModal({
  activity,
  onClose,
}: {
  activity: Activity;
  onClose: () => void;
}) {
  const explorerUrl = activity.digest
    ? `https://suiexplorer.com/txblock/${activity.digest}`
    : null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong animate-rise w-full max-w-shell rounded-t-2xl p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold capitalize text-white">
            {activity.kind} {activity.asset}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            ✕
          </button>
        </div>
        <div className="space-y-2.5 text-sm text-white/55">
          <div className="flex justify-between">
            <span>Status</span>
            <span className="capitalize font-medium text-white">{activity.status}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium text-white">
              {new Date(activity.created_at).toLocaleString()}
            </span>
          </div>
          {activity.counterparty && (
            <div className="flex justify-between">
              <span>Counterparty</span>
              <span className="max-w-[200px] break-all text-right font-medium text-white">
                {activity.counterparty}
              </span>
            </div>
          )}
          {activity.digest && (
            <div className="flex justify-between">
              <span>Digest</span>
              <span className="max-w-[160px] break-all text-right font-mono text-xs text-white">
                {activity.digest}
              </span>
            </div>
          )}
        </div>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass mt-5 flex w-full items-center justify-center gap-2 rounded-btn py-3 text-sm font-medium text-violet-soft transition hover:bg-white/10"
          >
            <IconExternalLink size={15} />
            View on Sui Explorer
          </a>
        )}
      </div>
    </div>
  );
}
