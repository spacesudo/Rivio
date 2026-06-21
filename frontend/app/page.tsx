"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBrandGoogle, IconBrandApple } from "@tabler/icons-react";

import { assertConfig } from "@/lib/config";
import { getJwt, startGoogleLogin, startAppleLogin } from "@/lib/enoki";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const configError = assertConfig();

  useEffect(() => {
    getJwt().then((jwt) => {
      if (jwt) router.replace("/dashboard");
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const handleGoogle = async () => {
    if (configError) { toast(configError, "error"); return; }
    setGoogleBusy(true);
    try { await startGoogleLogin(); }
    catch (err) { toast(err instanceof Error ? err.message : "Sign-in failed.", "error"); setGoogleBusy(false); }
  };

  const handleApple = async () => {
    setAppleBusy(true);
    try { await startAppleLogin(); }
    catch (err) { toast(err instanceof Error ? err.message : "Sign-in failed.", "error"); setAppleBusy(false); }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            rivio<span className="text-[#6C63FF]">.</span>
          </h1>
          <p className="mt-3 text-base text-white/50">Finance at the speed of now.</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogle}
            disabled={googleBusy}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-btn bg-white font-medium text-[#111] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {googleBusy ? <Spinner size={16} className="border-[#111]/20 border-t-[#111]" /> : <IconBrandGoogle size={18} />}
            Continue with Google
          </button>

          <button
            onClick={handleApple}
            disabled={appleBusy}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-btn bg-white/10 font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ border: "0.5px solid rgba(255,255,255,0.12)" }}
          >
            {appleBusy ? <Spinner size={16} /> : <IconBrandApple size={18} />}
            Continue with Apple
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-white/25">
          No seed phrases. No gas fees. Just finance.
        </p>
      </div>
    </main>
  );
}
