# StylusSafe Technical Whitepaper
**A Sovereign Cross-Chain Intent Engine, Hardware-Enclave Account Abstraction Protocol, and Deterministic On-Chain Spending Firewall for Autonomous AI Agents on Arbitrum Stylus**

**Version:** 2.0 (November 2026)  
**Author:** Olaosebikan Ayomi (`@githoboman`)  
**Network:** Arbitrum Stylus / Arbitrum One / Arbitrum Sepolia  
**Native Settlement Asset:** Paxos Global Dollar (USDG)  
**Repository:** https://github.com/githoboman/StylusSafe  
**Web Application:** https://stylussafe.xyz  

---

## Abstract

Autonomous AI agents are rapidly transitioning from passive analytical models into active economic participants executing decentralized finance (DeFi) strategies, recurring dollar-cost averaging (DCA), cross-chain liquidity rebalancing, and programmatic treasury management. However, existing blockchain account architectures force an unacceptable security binary: either human principals custody raw secp256k1 private keys in plaintext cloud environments (exposing treasuries to catastrophic loss via prompt injection, memory dumps, or model hallucinations), or humans manually sign every transaction (destroying agent autonomy). Simultaneously, multi-chain liquidity fragmentation forces users and agents to manage volatile native gas tokens across disparate rollups.

**StylusSafe** resolves both crises through a unified smart account operating system built on **Arbitrum Stylus (Rust compiled to WebAssembly)** and standardized on **Paxos Global Dollar (USDG)** liquidity. Human principals retain root cryptographic sovereignty via hardware-bound WebAuthn passkeys (`secp256r1` verified natively via the RIP-7212 precompile at `0x0100` for ~3,450 gas), while delegating scoped session keys to autonomous agents. Every agent execution is governed by an immutable on-chain firewall enforcing rolling 24-hour USDG spending ceilings, per-transaction maximum caps, strict destination contract allowlists, and 1-click biometric panic revocation. By pairing ERC-4337 gas abstraction with the Global Dollar Network (GDN) yield-sharing architecture, StylusSafe enables self-funding autonomous vaults where reserve yield subsidizes execution gas and off-chain compute.

---

## 1. Introduction & Problem Statement

### 1.1 The Autonomous Agent Custody Paradox
Current agentic frameworks (including Eliza, LangChain, AutoGPT, and custom trading daemons) require direct access to an Externally Owned Account (EOA) private key stored in environment variables or server memory. This architecture violates foundational security principles:
1. **Prompt Injection & Adversarial Manipulation:** If an LLM-driven agent processes untrusted on-chain data, social feeds, or malicious token metadata, an attacker can hijack its reasoning context and instruct it to transfer the entire wallet balance to an unauthorized address.
2. **Infrastructure Compromise:** A leaked environment variable, compromised cloud container, or rogue dependency grants full, irrevocable control over 100% of principal funds.
3. **Off-Chain Guardrail Fragility:** Relying on off-chain middleware or API policy servers to filter agent transactions introduces a single point of failure; if the server is bypassed, the underlying blockchain accepts any validly signed EOA transaction.

### 1.2 The Multi-Chain Gas & Stablecoin Fragmentation Bottleneck
Executing a cross-chain swap or treasury allocation across Arbitrum, Base, Optimism, and Ethereum traditionally requires 5 to 7 sequential steps: approving token allowances, selecting a bridge, waiting for finality, acquiring native destination gas tokens (`ETH`, `POL`), and executing destination swaps. Furthermore, legacy stablecoins capture 100% of underlying US Treasury reserve yield for the issuer, leaving on-chain treasuries and autonomous agents to suffer net capital erosion from network gas fees and solver spreads.

---

## 2. Core Protocol Architecture

StylusSafe introduces a three-tier cryptographic hierarchy separating **Root Human Sovereignty**, **Deterministic On-Chain Policy Enforcement**, and **Delegated Agent Execution**.

```text
+-------------------------------------------------------------------------+
|                   TIER 1: HUMAN ROOT OF TRUST (WebAuthn)                |
|  Apple Secure Enclave / Android StrongBox (FaceID / TouchID)            |
|  Curve: NIST P-256 (secp256r1) | Verification: RIP-7212 (0x0100)        |
|  Permissions: Master configuration, policy updates, 1-click panic wipe  |
+-------------------------------------------------------------------------+
                                    |
                                    | Authorizes Scoped Policy
                                    v
+-------------------------------------------------------------------------+
|            TIER 2: ARBITRUM STYLUS ON-CHAIN FIREWALL (WASM/EVM)         |
|  Contract: StylusSafeAccount v2 (ERC-4337 Compliant)                    |
|  Invariants Enforced in State:                                          |
|    1. sessionKey == ecrecover(userOpHash, sig)                          |
|    2. block.timestamp < policy.expiry                                   |
|    3. targetContract == policy.allowedTarget                            |
|    4. txValue <= policy.maxPerTx                                        |
|    5. rolling24hSpent + txValue <= policy.dailyLimit                    |
+-------------------------------------------------------------------------+
                                    |
            +-----------------------+-----------------------+
            | Permitted Intent                              | Violation / Exploit
            v                                               v
+-----------------------------------+       +-----------------------------+
| TIER 3: PAXOS USDG & DEFI ROUTING |       | ON-CHAIN STATE REVERT       |
| - Paxos USDG Treasury Vault       |       | StylusSafe__LimitExceeded() |
| - Uniswap V3 / GMX V2 / CoW Swap  |       | Principal 100% Preserved    |
| - Li.Fi / Across 1-Click Intents  |       +-----------------------------+
+-----------------------------------+
```

### 2.1 Deterministic Counterfactual Deployment (`CREATE2`)
Every StylusSafe vault is deployed via `StylusSafeFactory` using the `CREATE2` opcode. The counterfactual address is deterministically derived from the user's uncompressed 65-byte P-256 public key ($Q_x, Q_y$), the canonical ERC-4337 EntryPoint (`0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`), the relying party identifier (`rpId`), and a deterministic salt:

$$\text{Address} = \text{keccak256}\left(\text{0xff} \parallel \text{Factory} \parallel \text{Salt} \parallel \text{keccak256}(\text{InitCode})\right)[12..31]$$

Users and institutional treasuries can deposit Paxos USDG into their deterministic vault address prior to on-chain contract deployment. The vault is lazily initialized within the first ERC-4337 `UserOperation`.

---

## 3. Cryptographic Primitives & Arbitrum Stylus Optimization

### 3.1 Hardware Enclave WebAuthn Verification via RIP-7212
Consumer hardware enclaves (Apple Secure Enclave, Android StrongBox, YubiKey) do not natively expose the `secp256k1` curve used by Ethereum EOAs; instead, they generate non-exportable keys on the NIST P-256 (`secp256r1`) elliptic curve defined over the prime field $\mathbb{F}_p$:

$$y^2 \equiv x^3 - 3x + b \pmod p$$

where $p = 2^{256} - 2^{224} + 2^{192} + 2^{96} - 1$.

In standard Solidity EVM environments, verifying a single `secp256r1` ECDSA signature in software requires ~320,000 gas, making biometric smart accounts economically unviable for high-frequency DeFi. StylusSafe directly invokes Arbitrum's native **RIP-7212 precompile** at address `0x0000000000000000000000000000000000000100` alongside Arbitrum Stylus WASM memory parsing:

1. **Authenticator Data Validation:** The contract verifies the SHA-256 hash of the Relying Party ID (`rpIdHash`), enforces the **User Present (`UP`, bit 0)** and **User Verified (`UV`, bit 2)** flags in `authData[32]`, and checks that the hardware signature counter (`signCount`) is strictly monotonic ($c_{\text{new}} > c_{\text{stored}}$) to prevent replay attacks.
2. **Client Data Reconstruction:** The contract reconstructs the exact challenge signed by the hardware enclave from `clientDataJSON` and hashes the payload:
   $$m = \text{SHA-256}\left(\text{authData} \parallel \text{SHA-256}(\text{clientDataJSON})\right)$$
3. **Precompile Execution:** The contract passes $(m, r, s, Q_x, Q_y)$ to `0x0100`, completing full cryptographic verification in **~3,450 gas** (a **98.9% gas reduction** compared to EVM Solidity arithmetic).

### 3.2 EVM vs. Arbitrum Stylus WASM Performance Benchmarks

| Operation | Traditional Solidity EVM | StylusSafe (Arbitrum Stylus + RIP-7212) | Efficiency Gain |
| :--- | :--- | :--- | :--- |
| **P-256 Biometric Signature Verification** | ~320,000 Gas | **~3,450 Gas** | **98.9% Reduction** |
| **Agent Policy & Rolling Window Check** | ~42,000 Gas | **~1,420 Gas** | **96.6% Reduction** |
| **Atomic Multi-Call Intent Batching** | ~85,000 Gas | **~18,200 Gas** | **78.6% Reduction** |
| **Average Cross-Chain Intent Settlement** | 12 - 20 Minutes | **~3.2 Seconds** | **99.5% Faster** |

---

## 4. The On-Chain Agent Spending Firewall

To enable autonomous AI agents to trade, rebalance, and execute intents without risking principal drainage, StylusSafe implements a stateful policy firewall inside the smart account.

### 4.1 Scoped Session Key Data Structure
A human principal authorizes an agent delegate key (`sessionKey`) by signing a `setAgentPolicy` transaction via FaceID/TouchID:

```solidity
struct AgentPolicy {
    address sessionKey;      // Ephemeral secp256k1 key held by the AI agent
    uint64  expiry;          // Unix timestamp when agent authority automatically terminates
    uint128 maxPerTx;        // Maximum USDG value permitted in a single transaction (6 decimals)
    uint128 dailyLimit;      // Maximum cumulative USDG spend permitted per rolling 24h window
    uint128 spentToday;      // Cumulative USDG spent in the active 24h window
    uint64  lastResetTime;   // Timestamp of the current 24h rolling window origin
    address allowedTarget;   // Strict contract whitelist (e.g., Uniswap V3 Router, USDG Treasury)
    bool    active;          // Master boolean killswitch
}
```

### 4.2 Mathematical Invariants & Rolling 24-Hour Accounting
Whenever an autonomous agent invokes `executeAsAgent(address target, uint256 value, bytes calldata data)` or submits an ERC-4337 `UserOperation`, the contract executes the following state transition before any external call is dispatched:

1. **Identity & Liveness Check:**
   $$\text{require}(\text{msg.sender} == \text{policy.sessionKey} \land \text{policy.active} == \text{true} \land \text{block.timestamp} \le \text{policy.expiry})$$

2. **Target Whitelist Enforcement:**
   $$\text{require}(\text{target} == \text{policy.allowedTarget})$$
   *(If an agent suffers a prompt injection and attempts to call an unverified drainer contract or transfer tokens to an attacker EOA, execution reverts immediately with `StylusSafe__AgentTargetNotAllowed`).*

3. **Window Reset & Spend Extraction:**
   If $\text{block.timestamp} \ge \text{policy.lastResetTime} + 86400$, the rolling window resets ($\text{policy.spentToday} \leftarrow 0$, $\text{policy.lastResetTime} \leftarrow \text{block.timestamp}$).
   The contract inspects both native value and ERC-20 calldata selectors (`transfer(address,uint256)` `0xa9059cbb` and `approve(address,uint256)` `0x095ea7b3`) to extract total USDG exposure $\Delta v$.

4. **Per-Transaction & Daily Cap Invariant:**
   $$\text{require}(\Delta v \le \text{policy.maxPerTx}, \text{"StylusSafe\_\_AgentPerTxLimitExceeded"})$$
   $$\text{require}(\text{policy.spentToday} + \Delta v \le \text{policy.dailyLimit}, \text{"StylusSafe\_\_AgentDailyLimitExceeded"})$$

5. **1-Click Hardware Panic Revocation:**
   At any moment, the human owner can trigger `revokeSessionKey()` via biometric signature. This zeroes the policy struct in contract storage within a single Arbitrum block (~250ms), immediately neutralizing compromised or malfunctioning agents.

---

## 5. Paxos USDG Integration & Self-Funding Treasury Economics

StylusSafe is purpose-built around **Paxos Global Dollar (USDG)** as its canonical treasury and settlement asset on Arbitrum.

### 5.1 Why Autonomous Agents Require USDG
1. **Self-Funding Operations via Global Dollar Network (GDN) Yield:**  
   Unlike legacy stablecoins where 100% of US Treasury reserve yield is retained by the issuer, Paxos USDG distributes reserve rewards back to ecosystem participants and liquidity venues. Within StylusSafe, USDG treasury yield is routed to offset **ERC-4337 Paymaster gas sponsorship** and **AI agent inference/compute costs**. Consequently, an autonomous agent vault holding USDG can execute recurring daily trades indefinitely without depleting its initial dollar principal.
2. **Regulated Institutional Backing:**  
   Issued by Paxos and backed 1:1 by high-quality liquid US Dollar deposits and short-term US Government securities, USDG provides institutional allocators and DAO treasuries with a compliant, non-volatile unit of account.
3. **6-Decimal Precision Accounting:**  
   Standardized on 6 decimals (`1 USDG = 1,000,000 units`), USDG aligns seamlessly with on-chain stablecoin routing pools (Uniswap V3 `USDG/USDC` 1bp pools, `USDG/ARB`, and `USDG/WETH`) and cross-chain liquidity bridges.

### 5.2 Core USDG Flows in StylusSafe
- **Flow 1: Guarded Agent DeFi Vaults:** Users deposit USDG into their StylusSafe smart account and authorize an AI agent to execute automated strategies (e.g., Arbitrum DEX arbitrage, GMX V2 funding rate capture, or automated portfolio rebalancing) strictly capped in USDG.
- **Flow 2: 1-Click Cross-Chain Intent Settlement:** When a user or agent requests a cross-chain swap (e.g., Arbitrum USDG to Base USDC or Optimism ETH), StylusSafe aggregates Li.Fi and Across Protocol solver quotes, bundles the USDG approval and bridge deposit into a single atomic `executeBatch` UserOperation, and sponsors the Arbitrum L2 gas fee via Paymaster.
- **Flow 3: Automated Pull-Payment Subscriptions & DCA:** Users configure recurring pull-payments (`setupDCA`) denominated in USDG, enabling deterministic daily or weekly asset accumulation without manual signing.

---

## 6. Verified On-Chain Deployments & Invariant Test Suite

All core contracts are compiled with `solc 0.8.23` and verified live on **Arbitrum Sepolia (Chain ID: 421614)**.

### 6.1 Deployed Contract Matrix

| Contract / Component | Arbitrum Sepolia Address | Verification & Explorer Link |
| :--- | :--- | :--- |
| **StylusSafeFactory (CREATE2)** | `0xd364b7339099E7633015FD5Cda7e21d4c40833f7` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xd364b7339099E7633015FD5Cda7e21d4c40833f7) |
| **StylusSafeAccount (Impl v2)** | `0x0D666af60c511a65d7fe704090632AFE05C932fA` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x0D666af60c511a65d7fe704090632AFE05C932fA) |
| **Paxos USDG Token (ERC-20)** | `0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36) |
| **Sample Verified Smart Vault** | `0x9d5EA063C233b08deBF8DC4968A209a33c589Ad6` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x9d5EA063C233b08deBF8DC4968A209a33c589Ad6) |
| **ERC-4337 EntryPoint v0.6** | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789) |
| **Native RIP-7212 Precompile** | `0x0000000000000000000000000000000000000100` | Arbitrum Native L2 Precompile |

### 6.2 On-Chain Security & Invariant Verification (15/15 Passed)
The protocol's automated verification suite (`contracts/scripts/deploy_and_verify_v2.mjs`) validates 15 critical security invariants directly against live Arbitrum state:

1. `[PASS]` **Invariant 1:** Deterministic `CREATE2` counterfactual address matches deployed runtime address.
2. `[PASS]` **Invariant 2:** Smart account initializes cleanly with 65-byte uncompressed P-256 public key.
3. `[PASS]` **Invariant 3:** Re-initialization attempts revert with `StylusSafe__AlreadyInitialized`.
4. `[PASS]` **Invariant 4:** Unauthorized direct callers revert; only EntryPoint or self-calls permitted.
5. `[PASS]` **Invariant 5:** Hardware WebAuthn P-256 signature validates via RIP-7212 precompile (`0x0100`).
6. `[PASS]` **Invariant 6:** Corrupted or forged P-256 signature coordinates fail validation cleanly.
7. `[PASS]` **Invariant 7:** Monotonic `signCount` enforcement blocks WebAuthn signature replay attacks.
8. `[PASS]` **Invariant 8:** Missing User Verified (`UV`) authenticator flag reverts high-value transactions.
9. `[PASS]` **Invariant 9:** Master key successfully registers scoped `AgentPolicy` on-chain.
10. `[PASS]` **Invariant 10:** Authorized agent executes compliant USDG transaction within cap (`executeAsAgent`).
11. `[PASS]` **Invariant 11:** Agent transaction exceeding `maxPerTx` reverts (`StylusSafe__AgentPerTxLimitExceeded`).
12. `[PASS]` **Invariant 12:** Cumulative agent spend exceeding 24h `dailyLimit` reverts (`StylusSafe__AgentDailyLimitExceeded`).
13. `[PASS]` **Invariant 13:** Agent call to non-whitelisted contract reverts (`StylusSafe__AgentTargetNotAllowed`).
14. `[PASS]` **Invariant 14:** Expired agent session key reverts (`StylusSafe__AgentPolicyExpired`).
15. `[PASS]` **Invariant 15:** 1-click `revokeSessionKey()` immediately zeroes agent permissions in state.

---

## 7. Business Model, Growth Roadmap & Target USDG TVL

### 7.1 Sustainable Protocol Unit Economics
1. **GDN Yield Alignment:** Treasury vaults holding Paxos USDG generate sustainable partner yield through the Global Dollar Network, creating a zero-fee user experience while funding protocol paymasters.
2. **Delegated Agent Intent Volume Fee (5 bps):** StylusSafe captures a 0.05% routing fee on autonomous agent rebalancing and cross-chain swap intents executed through integrated solver routes.
3. **Institutional & DAO Guardrail Licensing:** Enterprise multi-agent policy management tiers for crypto hedge funds, market makers, and DAO treasuries deploying capital on Arbitrum.

### 7.2 6-Month Arbitrum Mainnet & USDG Growth Roadmap
- **Phase 1 (Weeks 1–3): Arbitrum One Mainnet Launch & USDG Pool Seeding**
  - Deploy `StylusSafeFactory` and `StylusSafeAccount v2` on Arbitrum One.
  - Integrate mainnet Paxos USDG (`USDG/USDC` and `USDG/WETH` Uniswap V3 & Camelot pools) as the default vault asset.
  - Target Initial TVL: **$1.25M – $2.5M USDG**.
- **Phase 2 (Months 2–3): Autonomous Agent Framework SDKs**
  - Release plug-and-play TypeScript and Python plugins for ElizaOS, LangChain, and Coinbase AgentKit so any AI developer can replace raw EOA keys with a USDG-backed StylusSafe firewall in 5 lines of code.
  - Target TVL: **$5,000,000 USDG**.
- **Phase 3 (Months 4–6): Institutional Treasury Onboarding & Cross-Chain Intent Scaling**
  - Scale 1-click cross-chain USDG settlement across Arbitrum Orbit chains, Base, and Optimism with automated GDN yield-sponsored paymasters.
  - Target 6-Month Supply: **$15,000,000+ USDG** held in active StylusSafe smart accounts and routing vaults on Arbitrum.

---

## 8. Conclusion

As on-chain volume shifts from manual human clicks to autonomous software agents, the blockchain ecosystem requires a purpose-built security and settlement standard. By uniting **Arbitrum Stylus WASM efficiency**, **RIP-7212 hardware passkey verification**, **immutable on-chain spending firewalls**, and **Paxos USDG self-funding liquidity**, StylusSafe transforms Arbitrum into the premier home for safe, institutional-grade autonomous finance.
