"use client";

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { toBase64 } from "@mysten/sui/utils";
import {
  buildTx,
  getQuote,
  isSuiTransaction,
  setSuiClient,
  type QuoteResponse,
} from "@7kprotocol/sdk-ts";

import { config } from "./config";

let client: SuiClient | null = null;

function getClient(): SuiClient {
  if (!client) {
    client = new SuiClient({ url: getFullnodeUrl(config.network) });
    setSuiClient(client);
  }
  return client;
}

export type SwapQuote = {
  raw: QuoteResponse;
  expectedOut: bigint;
  priceImpact: number | null;
  commissionBps: number;
};

export async function getSwapQuote(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  commissionBps?: number;
}): Promise<SwapQuote> {
  getClient();
  const commissionBps = params.commissionBps ?? 0;
  const raw = await getQuote({
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn.toString(),
    commissionBps,
    isSponsored: true,
  });
  return {
    raw,
    expectedOut: BigInt(raw.returnAmountAfterCommissionWithDecimal || raw.returnAmountWithDecimal || "0"),
    priceImpact: raw.priceImpact,
    commissionBps,
  };
}

export async function buildSwapKindBytes(params: {
  quote: SwapQuote;
  accountAddress: string;
  slippage: number;
  treasuryAddress?: string;
}): Promise<string> {
  const suiClient = getClient();
  const partner = params.treasuryAddress || params.accountAddress;
  const { tx } = await buildTx({
    quoteResponse: params.quote.raw,
    accountAddress: params.accountAddress,
    slippage: params.slippage,
    commission: { partner, commissionBps: params.quote.commissionBps },
    isSponsored: true,
  });
  if (!isSuiTransaction(tx)) {
    throw new Error("Unsupported routing (BluefinX) for sponsored swaps.");
  }
  const kindBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
  return toBase64(kindBytes);
}

export function minOutFromQuote(quote: SwapQuote, slippage: number): bigint {
  const scale = BigInt(10_000);
  const bps = BigInt(Math.round(slippage * 10_000));
  return (quote.expectedOut * (scale - bps)) / scale;
}
