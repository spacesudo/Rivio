"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconUser,
  IconShield,
  IconBell,
  IconChevronRight,
  IconLogout,
  IconExternalLink,
  IconCheck,
  IconX,
  IconClock,
  IconProgress,
} from "@tabler/icons-react";

import { getJwt, logout } from "@/lib/enoki";
import { fetchMe, getKyc, type VeloUser, type KycRecord } from "@/lib/api";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { config } from "@/lib/config";

type MenuItem = {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
};

type CompletionStep = {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
  action?: () => void;
};

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<VeloUser | null>(null);
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      const [me, kycData] = await Promise.all([
        fetchMe(jwt).catch(() => null),
        getKyc(jwt).catch(() => null),
      ]);
      setUser(me);
      setKyc(kycData);
      setLoading(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const copyAddress = async () => {
    if (!user?.wallet_address) return;
    await navigator.clipboard.writeText(user.wallet_address);
    toast("Address copied!", "success");
  };

  const kycStatus = kyc?.status ?? "none";
  
  const getKycInfo = () => {
    switch (kycStatus) {
      case "verified":
        return {
          label: "Verified",
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/15",
          borderColor: "border-emerald-500/30",
          icon: <IconCheck size={14} />,
          description: "Identity verified"
        };
      case "pending":
        return {
          label: "Pending",
          color: "text-amber-400",
          bgColor: "bg-amber-500/15",
          borderColor: "border-amber-500/30",
          icon: <IconClock size={14} />,
          description: "Verification in progress"
        };
      case "rejected":
        return {
          label: "Rejected",
          color: "text-red-400",
          bgColor: "bg-red-500/15",
          borderColor: "border-red-500/30",
          icon: <IconX size={14} />,
          description: "Verification failed"
        };
      default:
        return {
          label: "Not verified",
          color: "text-white/50",
          bgColor: "bg-white/10",
          borderColor: "border-white/20",
          icon: <IconShield size={14} />,
          description: "Complete KYC to unlock features"
        };
    }
  };

  const kycInfo = getKycInfo();

  const getCompletionSteps = (): CompletionStep[] => {
    if (!user) return [];

    const steps: CompletionStep[] = [
      {
        key: "profile",
        label: "Complete profile",
        description: "Add your name and email",
        completed: !!(user.first_name && user.last_name && user.email),
        icon: <IconUser size={16} />,
      },
      {
        key: "kyc",
        label: "Identity verification",
        description: "Verify your identity with KYC",
        completed: kycStatus === "verified",
        icon: kycInfo.icon,
      },
    ];

    return steps;
  };

  const completionSteps = getCompletionSteps();
  const completedSteps = completionSteps.filter(step => step.completed).length;
  const completionPercentage = completionSteps.length > 0 ? (completedSteps / completionSteps.length) * 100 : 0;

  const items: MenuItem[] = [
    {
      label: "Identity verification",
      sub: kycInfo.description,
      icon: <IconShield size={18} />,
      badge: kycInfo.label,
      badgeColor: `${kycInfo.bgColor} ${kycInfo.color}`,
    },
    {
      label: "Notifications",
      sub: "Push and email alerts",
      icon: <IconBell size={18} />,
      badge: "Coming soon",
      badgeColor: "glass-accent text-primary",
    },
    {
      label: "Wallet address",
      sub: user ? `${user.wallet_address.slice(0, 6)}…${user.wallet_address.slice(-4)}` : "—",
      icon: <IconUser size={18} />,
      onClick: copyAddress,
    },
  ];

  const name = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Rivio User"
    : null;

  const initials = user
    ? ((user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")).toUpperCase() || user.email?.[0]?.toUpperCase() || "R"
    : "R";

  const getCompletionColor = () => {
    if (completionPercentage === 100) return "bg-emerald-500";
    if (completionPercentage >= 50) return "bg-amber-500";
    return "bg-white/30";
  };

  return (
    <div className="app-bg flex min-h-screen flex-col pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pb-4 pt-safe pt-8">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full glass-strong text-neutral transition-all hover:scale-105"
        >
          <IconArrowLeft size={20} />
        </button>
        <h1 className="text-headline text-xl text-white">Profile</h1>
        <div className="flex-1" />
        <div className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 px-6 py-6">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xl font-bold text-white shadow-lg">
            {loading ? "…" : initials}
          </div>
          {kycStatus === "verified" && (
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <IconCheck size={10} className="text-white" />
            </div>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <p className="text-sm font-semibold text-white">{name}</p>
        )}
        {loading ? (
          <Skeleton className="h-3.5 w-40" />
        ) : (
          <p className="text-xs text-white/40">{user?.email ?? "No email"}</p>
        )}
        <div className={`rounded-pill border px-3 py-1 text-[10px] font-medium ${kycInfo.bgColor} ${kycInfo.color} ${kycInfo.borderColor}`}>
          {kycInfo.icon}
          <span className="ml-1">{kycInfo.label}</span>
        </div>
      </div>

      <div className="flex-1 px-6">
        {/* Profile completion */}
        {completionSteps.length > 0 && (
          <div className="glass-card animate-rise mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconProgress size={16} className="text-primary" />
                <span className="text-sm font-medium text-white">Profile Completion</span>
              </div>
              <span className="text-sm font-semibold text-white">{Math.round(completionPercentage)}%</span>
            </div>
            
            {/* Progress bar */}
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div 
                className={`h-full transition-all duration-500 ${getCompletionColor()}`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Completion steps */}
            <div className="space-y-2">
              {completionSteps.map((step) => (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    step.completed ? 'bg-emerald-500' : 'bg-white/10'
                  }`}>
                    {step.completed ? (
                      <IconCheck size={10} className="text-white" />
                    ) : (
                      <span className="text-[10px] text-white/50">{step.icon}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${step.completed ? 'text-white' : 'text-white/50'}`}>
                      {step.label}
                    </p>
                    <p className="text-[10px] text-white/40">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account menu */}
        <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">Account</div>
        <div className="glass-card animate-rise overflow-hidden rounded-card">
          {items.map((item, i) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-white/5 ${i < items.length - 1 ? "divider" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-primary">{item.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  {item.sub && <p className="text-xs text-white/45">{item.sub}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {item.onClick && <IconChevronRight size={14} className="text-white/40" />}
              </div>
            </button>
          ))}
        </div>

        {/* Resources */}
        <div className="mb-2 mt-4 px-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">Resources</div>
        <div className="glass-card animate-rise overflow-hidden rounded-card" style={{ animationDelay: "60ms" }}>
          <a
            href="https://suiexplorer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="divider flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <IconExternalLink size={18} className="text-primary" />
              <p className="text-sm font-medium text-white">Sui Explorer</p>
            </div>
            <IconChevronRight size={14} className="text-white/40" />
          </a>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-4 text-red-400 transition-colors hover:bg-red-500/10"
          >
            <IconLogout size={18} />
            <p className="text-sm font-medium">Sign out</p>
          </button>
        </div>
      </div>

      <FloatingNav />
    </div>
  );
}
