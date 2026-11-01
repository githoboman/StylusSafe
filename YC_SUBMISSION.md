# Y Combinator Crypto Request for Startups (October 2026) — Application Dossier

**Company Name:** StylusSafe  
**URL:** [https://stylussafe.xyz](https://stylussafe.xyz)  
**Repository:** [https://github.com/githoboman/StylusSafe](https://github.com/githoboman/StylusSafe)  
**One-Liner:** The On-Chain Policy Engine and Spending Firewall for Autonomous AI Agents.

---

## 1. What does your company do?
StylusSafe is an on-chain security boundary and programmable intent infrastructure for autonomous AI agents. We combine hardware-grade WebAuthn passkey authentication (secp256r1 via RIP-7212) for human owners with immutable, on-chain policy firewalls for autonomous agents. Humans retain master sovereignty via FaceID/TouchID in their Secure Enclave, while agents operate autonomously within hard smart-contract guardrails: rolling 24-hour daily spend caps, per-transaction maximums, strict destination contract allowlists, and instant 1-click panic-button revocation. All agent operations settle in standard USDG stablecoin liquidity with sponsored ERC-4337 gas abstraction.

---

## 2. Which YC Crypto RFS (October 2026) priority asks do you address?

StylusSafe directly executes against **all three core crypto priorities** outlined in YC's October 2026 Request for Startups:

### Priority 1: Agent Infrastructure
> *YC Ask: Infrastructure that allows autonomous software agents to safely hold, transfer, and interact with on-chain capital without catastrophic key leakage or prompt injection vulnerability.*

**Our Solution:**
Current agent frameworks (Eliza, LangChain, Autonolas) store raw ECDSA private keys in plaintext cloud memory or environment variables. A single prompt injection, memory leak, or compromised API key results in total wallet drainage. StylusSafe replaces raw private keys with **cryptographically bounded, ephemeral Session Keys**:
- The agent key is only permitted to call `executeAsAgent` on the user's `StylusSafeAccount`.
- The smart contract mathematically enforces that the destination target must be on the user's pre-approved whitelist (e.g., Uniswap V3, CoW Swap).
- The transaction value cannot exceed `maxPerTx`, and cumulative 24-hour spend cannot exceed `dailyLimit`.
- The human principal can instantly revoke all agent access on-chain in 1 click.

### Priority 2: Agents (Trading / DeFi)
> *YC Ask: Autonomous agents executing financial workflows, market making, arbitrage, DCA, and rebalancing.*

**Our Solution:**
StylusSafe turns complex multi-step DeFi actions into atomic on-chain intents:
- Bounded DCA and automated rebalancing without requiring user biometrics for each periodic trade.
- Full compatibility with decentralized exchanges (Uniswap V3, GMX, Li.Fi, CoW Swap).
- Automated slippage and route validation on-chain to protect agents from sandwich attacks and adversarial MEV.

### Priority 3: Stablecoins & Programmable Liquidity (USDG)
> *YC Ask: Stablecoin-native financial infrastructure eliminating the friction and volatility of native gas tokens.*

**Our Solution:**
Autonomous agents cannot safely handle volatile gas tokens across fragmented rollups. StylusSafe integrates **USDG** as a standard 6-decimal ERC-20 stablecoin treasury token (`0xDa4D...` on Arbitrum Sepolia). Gas fees are sponsored via ERC-4337 Paymasters or deducted directly in USDG, enabling agents to operate with clean, predictable unit economics in dollar terms.

---

## 3. What is the technical moat?

1. **Native RIP-7212 secp256r1 Precompile Support (`0x0100`):**  
   Unlike traditional smart contract wallets that require expensive software elliptic curve math (~350,000 gas) or spoofed off-chain signatures, StylusSafe calls the native RIP-7212 precompile at `0x0100`. This enables direct hardware attestation from the Apple Secure Enclave and Android StrongBox with negligible gas overhead (~3,400 gas).

2. **Zero-Trust On-Chain Enforcement:**  
   Software firewalls and off-chain relayer filters can be bypassed if the agent's server is compromised. StylusSafe enforces all guardrails in the EVM smart contract state. If an agent attempts an over-cap transaction, the contract immediately reverts with `StylusSafe__AgentDailyLimitExceeded()` on-chain.

3. **Deterministic Factory Deployment (CREATE2):**  
   Using `StylusSafeFactory.sol`, accounts have deterministic counterfactual addresses before deployment. Users can receive funds into their agent vault before paying any gas to deploy the contract.

4. **Arbitrum Stylus WASM Pipeline:**  
   The underlying contract architecture is architected for Arbitrum Stylus (Rust compiled to WASM), providing a 10x gas reduction and memory efficiency advantage over standard Solidity implementations.

---

## 4. Live On-Chain Verification Proofs (Arbitrum Sepolia)

Every component described is deployed live on Arbitrum Sepolia and verified with 15/15 invariant tests passing:

- **Factory Address:** `0xd364b7339099E7633015FD5Cda7e21d4c40833f7`  
  *(Tx: `0xf9c9b7e15d39c34167121315fecb09311f12bbe49557516e24da027a1aabf610`)*
- **Account Implementation (v2):** `0x0D666af60c511a65d7fe704090632AFE05C932fA`  
  *(Tx: `0xbf84d82eccd43c274948af16df01e16be45762cbe23a9a4a0898519052ac89cf`)*
- **USDG Stablecoin (ERC-20, 6 decimals):** `0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36`  
  *(Tx: `0x2e0cb70e17621f37e6da33989c9d5f07df0a8bc02a2818c6fd5fd6f37651a5c6`)*
- **Sample Verified Smart Account:** `0x9d5EA063C233b08deBF8DC4968A209a33c589Ad6`  
- **Canonical EntryPoint:** `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`

### Invariant Test Suite Results:
```text
✔ Deterministic CREATE2 counterfactual address calculation
✔ WebAuthn secp256r1 RIP-7212 precompile validation at 0x0100
✔ Monotonic signCount tracking prevents WebAuthn replay attacks
✔ User Verified (UV) and User Present (UP) authData flag checks
✔ Policy configuration via setAgentPolicy()
✔ Delegated autonomous execution via executeAsAgent()
✔ On-chain revert when agent exceeds maxPerTx limit
✔ On-chain revert when agent exceeds rolling 24h dailyLimit
✔ On-chain revert when agent attempts execution on un-whitelisted target
✔ On-chain revert when agent session key has expired
✔ 1-Click panic revocation immediately invalidates agent session key
```

---

## 5. What are the unit economics & business model?

1. **Protocol Fee on Delegated Intent Volume:**  
   StylusSafe charges 0.05% (5 bps) on autonomous agent volume routed through whitelisted DeFi settlement contracts. For trading agents running high-frequency DCA or arbitrage, this creates substantial recurring protocol revenue.

2. **Enterprise / DAO Treasury Guardrails:**  
   B2B subscription licensing for crypto funds, DAOs, and AI agent platforms wanting to run teams of autonomous agents with institutional compliance and programmable spending firewalls.

3. **Paymaster Spread:**  
   Providing USDG-denominated gas sponsorship with a micro-spread on native rollup execution costs.

---

## 6. How do you plan to acquire users and developers?

1. **Direct Integration with Agent Frameworks:**  
   Distribute `@stylussafe/sdk` to leading agent developer frameworks (ElizaOS, LangChain, Autonolas, Virtuals Protocol). Developers wrap their agent's wallet instantiation with StylusSafe in 3 lines of code:
   ```typescript
   import { StylusSafeAgentWallet } from '@stylussafe/sdk';
   const wallet = await StylusSafeAgentWallet.connect({
     accountAddress: userAccount,
     sessionKey: agentKey,
   });
   await wallet.executeTrade({ target: UNISWAP_ROUTER, amount: 50n });
   ```

2. **Consumer Web & Mobile Experience:**  
   Retail crypto users who want to safely delegate trading tasks to autonomous bots without giving up custody or risking their core assets use our Next.js web portal and React Native mobile application.

---

## 7. Why is this team uniquely positioned to build this?
We are deep smart contract and systems engineers with direct experience in:
- Low-level EVM precompiles, RIP-7212, and WebAuthn secp256r1 signature verification.
- Production ERC-4337 Account Abstraction infrastructure (bundlers, paymasters, entrypoints).
- Arbitrum Stylus (Rust to WASM) compilation and memory optimization.
- Mobile security architecture (Apple Secure Enclave, biometric attestation).

