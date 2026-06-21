"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconUser, IconMail, IconArrowRight } from "@tabler/icons-react";

import { getJwt } from "@/lib/enoki";
import { fetchMe, updateMe, isProfileComplete } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      const me = await fetchMe(jwt).catch(() => null);
      if (!me) { router.replace("/"); return; }
      if (isProfileComplete(me)) { router.replace("/dashboard"); return; }
      setFirstName(me.first_name ?? "");
      setLastName(me.last_name ?? "");
      setEmail(me.email ?? "");
      setLoading(false);
    })();
  }, [router]);

  const valid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async () => {
    if (!valid) { toast("Please fill in all fields with a valid email.", "error"); return; }
    setBusy(true);
    try {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Not signed in.");
      await updateMe(jwt, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
      });
      toast("Welcome to Rivio!", "success");
      router.replace("/dashboard");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save your profile.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col px-6 pt-16">
      <div className="animate-rise">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Let&apos;s set up your profile
        </h1>
        <p className="mt-2 text-sm text-white/50">
          We just need a few details to personalize your Rivio account.
        </p>
      </div>

      <div className="animate-rise mt-10 space-y-4" style={{ animationDelay: "60ms" }}>
        <div className="grid grid-cols-2 gap-3">
          <Field
            icon={<IconUser size={16} />}
            placeholder="First name"
            value={firstName}
            onChange={setFirstName}
            autoFocus
          />
          <Field
            placeholder="Last name"
            value={lastName}
            onChange={setLastName}
          />
        </div>
        <Field
          icon={<IconMail size={16} />}
          placeholder="Email address"
          value={email}
          onChange={setEmail}
          type="email"
        />
      </div>

      <div className="glass-accent animate-rise mt-5 rounded-card px-4 py-3 text-xs text-violet-soft" style={{ animationDelay: "120ms" }}>
        Your email is used for account recovery and important notifications only.
      </div>

      <button
        onClick={handleSubmit}
        disabled={busy || !valid}
        className="animate-rise mt-auto mb-10 flex w-full items-center justify-center gap-2 rounded-btn bg-[#6C63FF] py-4 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ animationDelay: "160ms" }}
      >
        {busy ? <Spinner size={16} /> : null}
        {busy ? "Saving…" : "Continue"}
        {!busy && <IconArrowRight size={18} />}
      </button>
    </main>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  autoFocus,
}: {
  icon?: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="glass flex items-center gap-2.5 rounded-btn px-4 py-3.5 focus-within:border-[#6C63FF]">
      {icon && <span className="text-white/40">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
      />
    </div>
  );
}
