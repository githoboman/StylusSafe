# StylusSafe: The Invisible Cross-Chain Wallet

**StylusSafe** is a next-generation "Intent-Based" Smart Wallet that makes blockchain boundaries completely invisible. By combining **ZeroDev (ERC-4337 Account Abstraction)**, **Passkey Authentication (WebAuthn)**, and the **Li.Fi Aggregation Engine**, it solves the biggest friction point in crypto today: Cross-Chain Swaps.

## 🚀 The Problem & Our Pitch
Right now, if a user has `$500` in USDC on **Arbitrum**, and they want to buy a newly launched token on **Base**, it takes 20 minutes and 6 tedious steps: finding a bridge, paying gas in ETH to bridge, waiting, buying gas on the new chain, and finally swapping. 

**StylusSafe eliminates this entirely:**
1. **Passkey Onboarding:** Users create wallets instantly using FaceID/TouchID. No seed phrases to store or lose.
2. **Gasless Execution:** Users never need to hold native gas tokens (ETH) on *any* chain. Our ERC-4337 Paymaster sponsors all gas.
3. **1-Click Universal Swap:** Users simply declare their *Intent*: "Turn my Arbitrum USDC into this new Base Meme Token." 
4. **Automated Routing:** Under the hood, StylusSafe automatically batches the token approvals, routes the funds across the optimal bridge, executes the swap on the destination chain, and pays the gas—all in a single click, instantly. 

What used to take 20 minutes now takes 3 seconds and one FaceID scan.

---

## 🏗 What We Built

### 1. The Intent Execution Engine (`useInvisibleWallet.ts`)
Instead of building standard transaction flows, we engineered a custom cross-chain router.
- **Li.Fi API Integration:** Dynamically fetches optimal routes for swapping ANY token on ANY EVM chain to ANY destination token.
- **Dynamic Token Resolution:** Supports pasting brand new, unlisted `0x` token contracts to instantly swap into newly launched tokens.
- **Transaction Batching:** Combines ERC20 `approve` and `swap` execution into single seamless intents.

### 2. High-Performance Web Portal (Next.js)
A production-ready Next.js web application deployed to Vercel.
- **Premium Design System:** Built using Tailwind CSS v4 featuring a stark black, white, and reddish-orange (`#FF4500`) "Swiss-architecture" aesthetic.
- **Dynamic Dashboard:** Custom Network Selectors, interactive `Custom Token Import` modals, and real-time viem-based RPC balance fetching.
- **Biometric Simulation:** Engineered custom Modals to handle seamless FaceID / Passkey simulated approvals.

### 3. Native Mobile Application (React Native)
A 1-to-1 pixel-perfect port of the Web UI to iOS and Android using Expo.
- **NativeWind Integration:** Flawlessly recycles Web Tailwind classes into React Native `<View>` components.
- **Cross-Chain Modals:** Replicated the entire Li.Fi cross-chain swap flow on mobile using native `ScrollView` paradigms.

## 📁 Repository Structure
```text
StylusSafe/
├── web/              # Next.js Web App (ZeroDev & Li.Fi integration)
│   ├── tailwind.config.ts
│   └── src/app/      # Web Screens (Dashboard, Transfer, Security)
│
└── mobile-app/       # React Native Expo App (iOS / Android)
    ├── tailwind.config.js
    └── src/app/      # Native Screens (Tabs, Modals)
```
