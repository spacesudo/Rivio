"use client";

import { useRouter } from "next/navigation";

export function Header({
  initials,
  dark = true,
}: {
  initials?: string;
  dark?: boolean;
}) {
  const router = useRouter();
  const textColor = dark ? "text-white" : "text-[#111]";
  const accentColor = dark ? "text-[#6C63FF]" : "text-[#6C63FF]";
  const avatarBg = dark ? "bg-white/15" : "bg-[#F0EFFE]";
  const avatarText = dark ? "text-white" : "text-[#6C63FF]";

  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-5">
      <button
        onClick={() => router.push("/dashboard")}
        className={`text-lg font-bold tracking-tight ${textColor}`}
      >
        rivio<span className={accentColor}>.</span>
      </button>
      {initials && (
        <button
          onClick={() => router.push("/profile")}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${avatarBg} ${avatarText}`}
        >
          {initials}
        </button>
      )}
    </div>
  );
}
