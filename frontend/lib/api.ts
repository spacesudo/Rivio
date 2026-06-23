import { config } from "./config";
import { http } from "./http";

export type VeloUser = {
  uid: string;
  oauth_provider: string;
  email: string | null;
  wallet_address: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_restricted: boolean;
  created_at: string;
  updated_at: string;
};

export type KycRecord = {
  uid: string;
  status: "none" | "pending" | "verified" | "rejected";
  provider: string | null;
  country: string | null;
  risk_level: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsoredTransaction = {
  digest: string;
  bytes: string;
  network: string;
};

export type WalletBalance = {
  wallet_address: string;
  // Decimal amounts serialized as strings to preserve precision.
  sui: string;
  usdc: string;
};

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  jwt: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | null = null;
    try {
      const data = await res.json();
      message = data.message ?? data.detail ?? message;
      code = data.error_code ?? null;
    } catch {
      // ignore non-JSON bodies
    }
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/";
    }
    throw new ApiError(message, res.status, code);
  }

  return res.json() as Promise<T>;
}

export function fetchMe(jwt: string): Promise<VeloUser> {
  return request<VeloUser>("/api/v1/auth/me", jwt);
}

export function getKyc(jwt: string): Promise<KycRecord> {
  return request<KycRecord>("/api/v1/kyc", jwt);
}

export function getBalance(jwt: string): Promise<WalletBalance> {
  return request<WalletBalance>("/api/v1/wallet/balance", jwt);
}

export type AssetBalance = {
  symbol: string;
  // Decimal amounts serialized as strings to preserve precision.
  balance: string;
  usd_price: string | null;
  usd_value: string | null;
};

export type WalletAssets = {
  wallet_address: string;
  assets: AssetBalance[];
  total_usd: string;
};

export function getAssets(jwt: string): Promise<WalletAssets> {
  return request<WalletAssets>("/api/v1/wallet/assets", jwt);
}

export function submitKyc(
  jwt: string,
  body: { country?: string; date_of_birth?: string } = {},
): Promise<KycRecord> {
  return request<KycRecord>("/api/v1/kyc", jwt, { method: "POST", body });
}

export function buildSuiTransfer(
  jwt: string,
  recipient: string,
  amount: number,
): Promise<SponsoredTransaction> {
  return request<SponsoredTransaction>("/api/v1/transfers/sui", jwt, {
    method: "POST",
    body: { recipient, amount },
  });
}

export function buildUsdcTransfer(
  jwt: string,
  recipient: string,
  amount: number,
): Promise<SponsoredTransaction> {
  return request<SponsoredTransaction>("/api/v1/transfers/usdc", jwt, {
    method: "POST",
    body: { recipient, amount },
  });
}

export function executeTransfer(
  jwt: string,
  digest: string,
  signature: string,
): Promise<{ digest: string }> {
  return request<{ digest: string }>("/api/v1/transfers/execute", jwt, {
    method: "POST",
    body: { digest, signature },
  });
}

export type OnrampWidget = {
  widget_url: string;
};

export type OnrampWidgetParams = {
  fiat_currency?: string;
  fiat_amount?: number;
  crypto_currency_code?: string;
  network?: string;
  wallet_address?: string;
  redirect_url?: string;
};

export function createOnrampWidget(
  jwt: string,
  params: OnrampWidgetParams = {},
): Promise<OnrampWidget> {
  return request<OnrampWidget>("/api/v1/onramp/widget", jwt, {
    method: "POST",
    body: params,
  });
}

// ---------------------------------------------------------------------------
// Swap (7K aggregator, built client-side, sponsored by the backend)
// ---------------------------------------------------------------------------

export type SwapToken = {
  symbol: string;
  type: string;
  scalar: number;
};

export type SwapTokens = {
  network: string;
  tokens: SwapToken[];
};

export type SponsoredSwap = SponsoredTransaction & {
  from_coin: string;
  to_coin: string;
  amount_in: number;
  min_out: number;
};

export type SwapRecord = {
  uid: string;
  pool_key: string;
  from_coin: string;
  to_coin: string;
  amount_in: number;
  min_out: number;
  sender: string;
  status: "pending" | "sponsored" | "executed" | "failed";
  sui_digest: string | null;
  created_at: string;
};

export function getSwapTokens(jwt: string): Promise<SwapTokens> {
  return request<SwapTokens>("/api/v1/swap/tokens", jwt);
}

export function sponsorSwap(
  jwt: string,
  body: {
    tx_bytes: string;
    from_coin: string;
    to_coin: string;
    amount_in: number;
    min_out?: number;
  },
): Promise<SponsoredSwap> {
  return request<SponsoredSwap>("/api/v1/swap/sponsor", jwt, {
    method: "POST",
    body,
  });
}

export function executeSwap(
  jwt: string,
  digest: string,
  signature: string,
): Promise<{ digest: string }> {
  return request<{ digest: string }>("/api/v1/swap/execute", jwt, {
    method: "POST",
    body: { digest, signature },
  });
}

export function getSwapHistory(
  jwt: string,
  params: { limit?: number; offset?: number } = {},
): Promise<SwapRecord[]> {
  const query = new URLSearchParams();
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const qs = query.toString();
  return request<SwapRecord[]>(`/api/v1/swap/history${qs ? `?${qs}` : ""}`, jwt);
}

// ---------------------------------------------------------------------------
// Lending (Navi protocol, built client-side, sponsored by the backend)
// ---------------------------------------------------------------------------

export type LendingActionType = "supply" | "withdraw" | "borrow" | "repay";

export type LendingAsset = {
  symbol: string;
  type: string;
  scalar: number;
};

export type LendingAssets = {
  network: string;
  assets: LendingAsset[];
};

export type SponsoredLending = SponsoredTransaction & {
  action: LendingActionType;
  asset: string;
  amount: number;
};

export type LendingPosition = {
  uid: string;
  action: LendingActionType;
  asset: string;
  amount: number;
  sender: string;
  status: "pending" | "sponsored" | "executed" | "failed";
  sui_digest: string | null;
  created_at: string;
};

export function getLendingAssets(jwt: string): Promise<LendingAssets> {
  return request<LendingAssets>("/api/v1/lending/assets", jwt);
}

export function sponsorLending(
  jwt: string,
  body: {
    tx_bytes: string;
    action: LendingActionType;
    asset: string;
    amount: number;
  },
): Promise<SponsoredLending> {
  return request<SponsoredLending>("/api/v1/lending/sponsor", jwt, {
    method: "POST",
    body,
  });
}

export function executeLending(
  jwt: string,
  digest: string,
  signature: string,
): Promise<{ digest: string }> {
  return request<{ digest: string }>("/api/v1/lending/execute", jwt, {
    method: "POST",
    body: { digest, signature },
  });
}

export function getLendingHistory(
  jwt: string,
  params: { limit?: number; offset?: number } = {},
): Promise<LendingPosition[]> {
  const query = new URLSearchParams();
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const qs = query.toString();
  return request<LendingPosition[]>(`/api/v1/lending/history${qs ? `?${qs}` : ""}`, jwt);
}

// ---------------------------------------------------------------------------
// Unified activity feed
// ---------------------------------------------------------------------------

export type ActivityKind = "send" | "receive" | "deposit" | "withdraw" | "swap" | "borrow" | "repay";

export type Activity = {
  uid: string;
  kind: ActivityKind;
  asset: string;
  amount: number;
  counterparty: string | null;
  status: string;
  digest: string | null;
  created_at: string;
};

type RawTransaction = {
  uid: string;
  tx_type: string;
  asset: string;
  amount: number;
  sender: string;
  recipient: string;
  status: string;
  sui_digest: string | null;
  created_at: string;
};

export async function getWalletHistory(jwt: string): Promise<Activity[]> {
  const [txRes, swapRes, lendRes] = await Promise.allSettled([
    http.get<RawTransaction[]>("/api/v1/transfers", {
      headers: { Authorization: `Bearer ${jwt}` },
    }),
    http.get<SwapRecord[]>("/api/v1/swap/history?limit=50", {
      headers: { Authorization: `Bearer ${jwt}` },
    }),
    http.get<LendingPosition[]>("/api/v1/lending/history?limit=50", {
      headers: { Authorization: `Bearer ${jwt}` },
    }),
  ]);

  const activities: Activity[] = [];

  if (txRes.status === "fulfilled") {
    for (const t of txRes.value.data) {
      activities.push({
        uid: t.uid,
        kind: t.tx_type as ActivityKind,
        asset: t.asset.toUpperCase(),
        amount: t.amount,
        counterparty: t.tx_type === "send" ? t.recipient : t.sender,
        status: t.status,
        digest: t.sui_digest,
        created_at: t.created_at,
      });
    }
  }

  if (swapRes.status === "fulfilled") {
    for (const s of swapRes.value.data) {
      activities.push({
        uid: s.uid,
        kind: "swap",
        asset: `${s.from_coin}→${s.to_coin}`,
        amount: s.amount_in,
        counterparty: "7K Protocol",
        status: s.status,
        digest: s.sui_digest,
        created_at: s.created_at,
      });
    }
  }

  if (lendRes.status === "fulfilled") {
    for (const l of lendRes.value.data) {
      activities.push({
        uid: l.uid,
        kind: l.action as ActivityKind,
        asset: l.asset,
        amount: l.amount,
        counterparty: "Navi Protocol",
        status: l.status,
        digest: l.sui_digest,
        created_at: l.created_at,
      });
    }
  }

  return activities.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getMe(jwt: string): Promise<VeloUser> {
  return http
    .get<VeloUser>("/api/v1/auth/me", { headers: { Authorization: `Bearer ${jwt}` } })
    .then((r) => r.data);
}

export function updateMe(
  jwt: string,
  body: { first_name?: string; last_name?: string; email?: string },
): Promise<VeloUser> {
  return request<VeloUser>("/api/v1/auth/me", jwt, { method: "PATCH", body });
}

export function isProfileComplete(user: VeloUser): boolean {
  return Boolean(user.first_name && user.last_name && user.email);
}

export type AiMessage = {
  role: "user" | "ai";
  content: string;
};

export type AiChatResponse = {
  reply: string;
  role: string;
};

export function sendAiMessage(
  jwt: string,
  messages: AiMessage[],
): Promise<AiChatResponse> {
  return request<AiChatResponse>("/api/v1/ai/chat", jwt, {
    method: "POST",
    body: { messages },
  });
}
