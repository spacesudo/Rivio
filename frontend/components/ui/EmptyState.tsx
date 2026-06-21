export function EmptyState({
  message,
  cta,
  onCta,
}: {
  message: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-white/50">{message}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          className="rounded-pill border border-[#6C63FF] px-4 py-1.5 text-sm text-violet-soft transition-colors hover:bg-[#6C63FF]/10"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
