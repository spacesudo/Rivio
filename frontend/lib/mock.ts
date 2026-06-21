export const MOCK_RIVIO_ASSET = {
  symbol: "$RIVIO",
  balance: "10,000",
  usd_price: "0.042",
  usd_value: "420.00",
  change_pct: 5.4,
};

export const MOCK_CHANGE_PCT = 2.31;

export const MOCK_CARD = {
  number: "**** **** **** 4291",
  name: "Rivio User",
  expiry: "••/••",
  network: "Sui Network",
};

export type MockAiMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
  action?: { label: string; type: string; params: Record<string, unknown> };
};

export const MOCK_AI_GREETING: MockAiMessage = {
  id: "welcome",
  role: "ai",
  content:
    "Hi! I'm your Rivio AI assistant. I can help you send payments, check balances, and manage your portfolio. What would you like to do?",
};

export const MOCK_AI_REPLIES: Record<string, MockAiMessage> = {
  default: {
    id: "r-default",
    role: "ai",
    content:
      "I can help with that! This feature is coming soon — the AI backend is not yet connected.",
  },
  send: {
    id: "r-send",
    role: "ai",
    content: "I can help you send funds. How much would you like to send and to whom?",
    action: { label: "Confirm send", type: "send", params: { amount: 10, token: "USDC" } },
  },
};
