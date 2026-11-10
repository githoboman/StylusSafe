/**
 * Li.Fi quote client (https://docs.li.fi). Used for live swap output, fees and ETA.
 *
 * Li.Fi only routes mainnet chains. Our smart account lives on Arbitrum Sepolia, so when a
 * testnet chain is selected we quote the equivalent Arbitrum One route and flag the result
 * as `indicative`. Execution on testnet still settles through the solver vault.
 */

export const LIFI_API = 'https://li.quest/v1';

const NATIVE = '0x0000000000000000000000000000000000000000';
/** Li.Fi needs a syntactically valid sender to produce a quote; used only when no wallet is connected. */
const QUOTE_PLACEHOLDER_SENDER = '0x000000000000000000000000000000000000dEaD';

/** Testnet chain id -> mainnet chain id used for indicative quotes. */
const TESTNET_TO_MAINNET: Record<number, number> = {
  421614: 42161, // Arbitrum Sepolia -> Arbitrum One
};

/** Mainnet token addresses per chain. USDG is a testnet stable and is quoted as USDC. */
const TOKEN_ADDRESSES: Record<string, Partial<Record<number, string>>> = {
  ETH: { 1: NATIVE, 10: NATIVE, 8453: NATIVE, 42161: NATIVE },
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  WBTC: {
    1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    10: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
    137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  },
  ARB: {
    1: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
    42161: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  },
  UNI: {
    1: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    10: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
    137: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
    42161: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
  },
  DEGEN: { 8453: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed' },
};

export type LifiQuote = {
  /** Human-readable output amount (already net of all fees). */
  toAmount: number;
  toAmountMin: number;
  /** Protocol + integrator fees, USD. */
  feeUsd: number;
  /** Estimated gas on the route, USD. */
  gasUsd: number;
  durationSec: number;
  /** Bridge / DEX Li.Fi picked, e.g. "across" or "uniswap". */
  tool: string;
  /** true when a testnet chain was mapped to its mainnet equivalent. */
  indicative: boolean;
  /** Spender address requiring ERC-20 approval on mainnet swaps when paying with a non-native token. */
  approvalAddress?: `0x${string}`;
  /** Resolved source token address used for mainnet Li.Fi routing. */
  fromTokenAddress?: `0x${string}`;
  /** Executable router/bridge transaction data returned by Li.Fi when chains and tokens are live mainnet assets. */
  transactionRequest?: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
    chainId?: number;
  };
};

export const FALLBACK_TOKEN_USD_PRICES: Record<string, number> = {
  USDG: 1.0,
  USDC: 1.0,
  USDT: 1.0,
  ETH: 2500.0,
  ARB: 0.85,
  DEGEN: 0.01,
  UNI: 7.5,
  WBTC: 65000.0,
};

const LLAMA_PRICE_IDS: Record<string, string> = {
  ETH: 'coingecko:ethereum',
  ARB: 'coingecko:arbitrum',
  UNI: 'coingecko:uniswap',
  WBTC: 'coingecko:wrapped-bitcoin',
  DEGEN: 'coingecko:degen-base',
  USDC: 'coingecko:usd-coin',
  USDT: 'coingecko:tether',
};

/** Fetches live USD token prices from DeFiLlama (with static fallback when offline). */
export async function fetchLiveTokenPrices(signal?: AbortSignal): Promise<{ prices: Record<string, number>; isLive: boolean }> {
  const prices: Record<string, number> = { ...FALLBACK_TOKEN_USD_PRICES };
  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/${Object.values(LLAMA_PRICE_IDS).join(',')}`, { signal });
    if (res.ok) {
      const json = await res.json();
      let updated = false;
      for (const [symbol, id] of Object.entries(LLAMA_PRICE_IDS)) {
        const p = json?.coins?.[id]?.price;
        if (typeof p === 'number' && p > 0) {
          prices[symbol] = p;
          updated = true;
        }
      }
      if (updated) return { prices, isLive: true };
    }
  } catch {
    // offline fallback
  }
  return { prices, isLive: false };
}

export type LifiQuoteParams = {
  fromChainId: number;
  toChainId: number;
  fromSymbol: string;
  toSymbol: string;
  fromDecimals: number;
  toDecimals: number;
  /** Human-readable input amount, e.g. 50 */
  amount: number;
  fromAddress?: string | null;
  signal?: AbortSignal;
};

const resolveChain = (id: number) => TESTNET_TO_MAINNET[id] ?? id;
const resolveSymbol = (s: string) => (s === 'USDG' ? 'USDC' : s);

function toBaseUnits(amount: number, decimals: number): string {
  const [whole, frac = ''] = amount.toFixed(decimals).split('.');
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0')).toString();
}

/** Returns a live Li.Fi quote, or null when no route can be quoted (unsupported token/chain, API down). */
export async function fetchLifiQuote(p: LifiQuoteParams): Promise<LifiQuote | null> {
  if (!Number.isFinite(p.amount) || p.amount <= 0) return null;

  const fromChain = resolveChain(p.fromChainId);
  const toChain = resolveChain(p.toChainId);
  const fromSym = resolveSymbol(p.fromSymbol);
  const toSym = resolveSymbol(p.toSymbol);
  const fromToken = TOKEN_ADDRESSES[fromSym]?.[fromChain];
  const toToken = TOKEN_ADDRESSES[toSym]?.[toChain];
  if (!fromToken || !toToken) return null;
  if (fromChain === toChain && fromToken.toLowerCase() === toToken.toLowerCase()) return null;

  const qs = new URLSearchParams({
    fromChain: String(fromChain),
    toChain: String(toChain),
    fromToken,
    toToken,
    fromAmount: toBaseUnits(p.amount, p.fromDecimals),
    fromAddress: p.fromAddress || QUOTE_PLACEHOLDER_SENDER,
    slippage: '0.005',
  });

  try {
    const res = await fetch(`${LIFI_API}/quote?${qs.toString()}`, { signal: p.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const est = json?.estimate;
    if (!est?.toAmount) return null;

    const sumUsd = (items: any[] | undefined) =>
      (items ?? []).reduce((acc, c) => acc + (parseFloat(c?.amountUSD) || 0), 0);

    const indicative = fromChain !== p.fromChainId || toChain !== p.toChainId || p.fromSymbol === 'USDG' || p.toSymbol === 'USDG';
    const txReq = !indicative && json?.transactionRequest?.to && json?.transactionRequest?.data
      ? {
          to: json.transactionRequest.to as `0x${string}`,
          data: json.transactionRequest.data as `0x${string}`,
          value: String(json.transactionRequest.value || '0x0'),
          chainId: typeof json.transactionRequest.chainId === 'number' ? json.transactionRequest.chainId : undefined,
        }
      : undefined;

    return {
      toAmount: Number(est.toAmount) / 10 ** p.toDecimals,
      toAmountMin: Number(est.toAmountMin ?? est.toAmount) / 10 ** p.toDecimals,
      feeUsd: sumUsd(est.feeCosts),
      gasUsd: sumUsd(est.gasCosts),
      durationSec: Math.round(Number(est.executionDuration) || 0),
      tool: String(json?.tool ?? json?.toolDetails?.name ?? 'li.fi'),
      indicative,
      approvalAddress: !indicative && est.approvalAddress ? (est.approvalAddress as `0x${string}`) : undefined,
      fromTokenAddress: !indicative ? (fromToken as `0x${string}`) : undefined,
      transactionRequest: txReq,
    };
  } catch {
    return null;
  }
}

