"use client";

import { EnokiFlow } from "@mysten/enoki";
import { fromBase64 } from "@mysten/sui/utils";

import { config } from "./config";

let flow: EnokiFlow | null = null;

export function getEnokiFlow(): EnokiFlow {
  if (typeof window === "undefined") {
    throw new Error("EnokiFlow is only available in the browser.");
  }
  if (!flow) {
    flow = new EnokiFlow({ apiKey: config.enokiApiKey });
  }
  return flow;
}

export function authRedirectUrl(): string {
  return `${window.location.origin}/auth`;
}

export async function startGoogleLogin(): Promise<void> {
  const enoki = getEnokiFlow();
  const url = await enoki.createAuthorizationURL({
    provider: "google",
    clientId: config.googleClientId,
    redirectUrl: authRedirectUrl(),
    network: config.network,
  });
  window.location.href = url;
}

export async function startAppleLogin(): Promise<void> {
  if (!config.appleClientId) throw new Error("Apple login is not configured.");
  const enoki = getEnokiFlow();
  const url = await enoki.createAuthorizationURL({
    // eslint-disable-next-line
    provider: "apple" as any,
    clientId: config.appleClientId,
    redirectUrl: authRedirectUrl(),
    network: config.network,
  });
  window.location.href = url;
}

export async function getJwt(): Promise<string | null> {
  const enoki = getEnokiFlow();
  const session = await enoki.getSession();
  return session?.jwt ?? null;
}

export async function logout(): Promise<void> {
  const enoki = getEnokiFlow();
  await enoki.logout();
}

/**
 * Sign sponsored transaction bytes (base64) with the user's zkLogin keypair.
 * Returns the zkLogin signature to submit to the execute endpoint.
 */
export async function signSponsoredBytes(bytesBase64: string): Promise<string> {
  const enoki = getEnokiFlow();
  const keypair = await enoki.getKeypair({ network: config.network });
  const { signature } = await keypair.signTransaction(fromBase64(bytesBase64));
  return signature;
}
