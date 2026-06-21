"use client";

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import {
  borrowCoinPTB,
  depositCoinPTB,
  getHealthFactor,
  getLendingState,
  getPool,
  repayCoinPTB,
  withdrawCoinPTB,
} from "@naviprotocol/lending";

import { config } from "./config";

export type LendingAction = "supply" | "withdraw" | "borrow" | "repay";

let client: SuiClient | null = null;

function getClient(): SuiClient {
  if (!client) {
    client = new SuiClient({ url: getFullnodeUrl(config.network) });
  }
  return client;
}

const env = config.network === "mainnet" ? "prod" : "dev";

export async function buildLendingKindBytes(params: {
  action: LendingAction;
  coinType: string;
  amount: number;
  sender: string;
}): Promise<string> {
  const suiClient = getClient();
  const { action, coinType, amount, sender } = params;
  const tx = new Transaction();
  tx.setSender(sender);
  const options = { client: suiClient, env } as const;

  if (action === "supply") {
    const coin = tx.add(
      coinWithBalance({ type: coinType, balance: BigInt(amount), useGasCoin: false }),
    );
    await depositCoinPTB(tx, coinType, coin, { ...options, amount });
  } else if (action === "repay") {
    const coin = tx.add(
      coinWithBalance({ type: coinType, balance: BigInt(amount), useGasCoin: false }),
    );
    await repayCoinPTB(tx, coinType, coin, { ...options, amount });
  } else if (action === "withdraw") {
    const coin = await withdrawCoinPTB(tx, coinType, amount, options);
    tx.transferObjects([coin], sender);
  } else if (action === "borrow") {
    const coin = await borrowCoinPTB(tx, coinType, amount, options);
    tx.transferObjects([coin], sender);
  }

  const bytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
  return toBase64(bytes);
}

export type LendingMarket = {
  symbol: string;
  coinType: string;
  supplyRate: number;
  borrowRate: number;
  ltv: number;
};

export async function getMarket(symbol: string, coinType: string): Promise<LendingMarket> {
  const pool = await getPool(coinType, { env });
  return {
    symbol,
    coinType,
    supplyRate: Number(pool.currentSupplyRate ?? 0),
    borrowRate: Number(pool.currentBorrowRate ?? 0),
    ltv: Number(pool.ltvValue ?? 0),
  };
}

export type LendingPositionView = {
  symbol: string;
  coinType: string;
  supplied: number;
  borrowed: number;
};

export type UserLending = {
  healthFactor: number | null;
  positions: LendingPositionView[];
};

export async function getUserLending(
  address: string,
  symbolByCoinType: Record<string, string>,
): Promise<UserLending> {
  const suiClient = getClient();
  const [states, hf] = await Promise.all([
    getLendingState(address, { client: suiClient, env }),
    getHealthFactor(address, { client: suiClient, env }).catch(() => null),
  ]);

  const positions: LendingPositionView[] = states.map((s) => {
    const coinType = s.pool.coinType;
    return {
      symbol: symbolByCoinType[coinType] ?? coinType,
      coinType,
      supplied: Number(s.supplyBalance ?? 0),
      borrowed: Number(s.borrowBalance ?? 0),
    };
  });

  return { healthFactor: hf, positions };
}
