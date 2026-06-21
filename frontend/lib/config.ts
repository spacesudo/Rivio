export const config = {
  enokiApiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY ?? "",
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  appleClientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  network: (process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet") as
    | "mainnet"
    | "testnet"
    | "devnet",
  swapTreasuryAddress: process.env.NEXT_PUBLIC_SWAP_TREASURY_ADDRESS ?? "",
  swapCommissionBps: Number(process.env.NEXT_PUBLIC_SWAP_COMMISSION_BPS ?? "85"),
};

export function assertConfig(): string | null {
  if (!config.enokiApiKey) return "NEXT_PUBLIC_ENOKI_API_KEY is not set.";
  if (!config.googleClientId) return "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.";
  return null;
}
