"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getEnokiFlow, getJwt } from "@/lib/enoki";
import { fetchMe, isProfileComplete } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getEnokiFlow().handleAuthCallback();
        const jwt = await getJwt();
        if (!jwt) throw new Error("Could not establish a session.");
        const me = await fetchMe(jwt);
        if (cancelled) return;
        router.replace(isProfileComplete(me) ? "/dashboard" : "/onboarding");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Authentication failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-lg font-semibold text-red-400">Sign-in failed</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button
              onClick={() => router.replace("/")}
              className="mt-6 rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
            >
              Back to home
            </button>
          </>
        ) : (
          <>
            <Spinner size={28} className="mx-auto" />
            <p className="mt-4 text-sm text-white/50">Completing sign-in…</p>
          </>
        )}
      </div>
    </main>
  );
}
