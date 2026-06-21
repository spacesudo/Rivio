export function HealthBar({ value }: { value: number | null }) {
  const clamped = value == null ? 0 : Math.min(value / 3, 1);
  const pct = Math.round(clamped * 100);

  const color =
    value == null
      ? "bg-white/20"
      : value < 1.2
        ? "bg-red-500"
        : value < 1.5
          ? "bg-amber-400"
          : "bg-emerald-500";

  const label =
    value == null
      ? "No position"
      : value < 1.0
        ? "Liquidation risk"
        : value < 1.2
          ? "High risk"
          : value < 1.5
            ? "Moderate"
            : "Healthy";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">Health factor</span>
        <span className={`font-semibold ${value == null ? "text-white/50" : value < 1.2 ? "text-red-400" : value < 1.5 ? "text-amber-400" : "text-emerald-400"}`}>
          {value == null ? "—" : value.toFixed(2)} · {label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-pill bg-white/10">
        <div
          className={`h-full rounded-pill transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
