"use client";

import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import { useTheme } from "@/contexts/ThemeContext";

const OPTIONS = [
  { label: "Light", value: "light", icon: IconSun },
  { label: "Dark", value: "dark", icon: IconMoon },
  { label: "System", value: "system", icon: IconDeviceDesktop },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ label, value, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 transition-all ${
              active
                ? "bg-primary text-white"
                : "glass-strong text-neutral hover:bg-white/5"
            }`}
          >
            <Icon size={18} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
