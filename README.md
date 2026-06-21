# Rivio

Rivio is a crypto-native neobank built on the Sui blockchain. It lets you hold, send, swap, and borrow against digital assets — all from a clean mobile interface that feels like a regular banking app, no crypto jargon required.

It's built for people who want the speed and freedom of crypto without having to juggle five different apps and a hardware wallet. Whether you're sending money across borders, earning yield on your savings, or just checking your balance — Rivio keeps it simple.

---

## What you can do

- **Send** — transfer USDC or SUI to any wallet address in a few taps
- **Receive** — share your address or QR code to get paid
- **Swap** — exchange tokens at the best available rate via the 7K aggregator
- **Borrow** — supply assets as collateral and borrow against them through Navi Protocol
- **History** — see all your transactions in one feed
- **Virtual card** — a Mastercard-branded card tied to your Sui wallet (mockup, Rain Cards integration coming)
- **USD & GBP accounts** — virtual bank accounts for fiat in and out (coming via Rain Cards)
- **AI assistant** — ask questions, get help navigating the app, and eventually trigger actions by just typing
- **Dark / light / system theme** — looks good however you like it

---

## Who it's for

Rivio is for anyone who moves money internationally, holds crypto, or just wants a smarter account. You don't need to know what a private key is — you sign in with Google, and your wallet is created automatically behind the scenes.

---

## How to use it

1. Open the app and tap **Sign in with Google**
2. You'll land on your dashboard — your balance, assets, and recent activity are all there
3. Use the floating button in the corner to navigate anywhere
4. To send money, tap the send icon, pick a token, enter an address and amount, and confirm
5. To swap, pick what you have and what you want — Rivio finds the best rate
6. To borrow, supply an asset first, then borrow against it
7. Your card and account details live under the **Accounts** tab

That's it. No seed phrases, no gas confusion, no setup.

---

## What it's built with

- **Frontend** — Next.js with TypeScript, styled with Tailwind CSS
- **Auth & wallets** — Enoki zkLogin (Google sign-in creates a self-custodial Sui wallet automatically)
- **Backend** — Python with FastAPI, PostgreSQL database
- **Swaps** — 7K Protocol aggregator
- **Lending** — Navi Protocol
- **Prices** — live token prices fetched on demand
- **AI** — OpenAI-powered assistant

---

## Roadmap

These are the things that are built and working in the app but are blocked by testnet limitations — they'll go live when we move to mainnet. A few others are partnerships we're actively working on.

| Feature | Status | Notes |
|---|---|---|
| Send USDC / SUI | Ready | Waiting on mainnet |
| Swap tokens | Ready | Waiting on mainnet liquidity |
| Borrow / supply via Navi | Ready | Waiting on mainnet |
| Transaction history | Ready | Waiting on real on-chain data |
| AI assistant | Partial | UI done, full action execution coming |
| Virtual Mastercard | In progress | Partnership with Rain Cards — launching before mainnet |
| USD virtual account | In progress | Rain Cards integration — launching before mainnet |
| GBP virtual account | In progress | Rain Cards integration — launching before mainnet |
| Physical card | Planned | Post-mainnet launch |
| $RIVIO token | Planned | Tokenomics in progress |

---

## A note on self-custody

Your wallet is yours. Rivio never holds your keys — they're derived from your Google identity through Sui's zkLogin system. That means you get a real self-custodial wallet with none of the usual setup friction. If Rivio disappeared tomorrow, your assets would still be on-chain and accessible.
