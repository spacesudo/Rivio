export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  const strokeWidth = Math.max(2, Math.round(size / 12));
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <span
      className={`inline-block animate-spin ${className}`}
      style={{ width: size, height: size, animationDuration: "0.8s" }}
      role="status"
      aria-label="Loading"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <defs>
          <linearGradient id="rivio-spinner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C63FF" />
            <stop offset="100%" stopColor="#8B85FF" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle
          cx={c}
          cy={c}
          r={r}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          stroke="url(#rivio-spinner)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.72}
        />
      </svg>
    </span>
  );
}
