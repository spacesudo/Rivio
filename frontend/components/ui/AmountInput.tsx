"use client";

export function AmountInput({
  value,
  onChange,
  usdEquiv,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  usdEquiv?: string | null;
  placeholder?: string;
  dark?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          placeholder={placeholder ?? "0.00"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="form-input w-full text-display text-3xl text-white placeholder:text-neutral/25 outline-none disabled:opacity-50 pr-12"
        />
        {value && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-2 w-2 rounded-full bg-primary pulse-glow" />
          </div>
        )}
      </div>
      {usdEquiv != null && (
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral/50 to-transparent" />
          <p className="text-caption text-neutral">≈ ${usdEquiv} USD</p>
          <div className="h-px flex-1 bg-gradient-to-r from-neutral/50 via-transparent to-transparent" />
        </div>
      )}
    </div>
  );
}
