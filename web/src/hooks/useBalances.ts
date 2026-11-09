import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';

export const USDG_ADDRESS = '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' as const;

const CHAIN_CONFIGS: Record<number, { rpc: string; usdc: `0x${string}`; usdg?: `0x${string}` }> = {
  // Arbitrum Sepolia - proxied via server route to avoid client key exposure
  421614: {
    rpc: typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : 'https://sepolia-rollup.arbitrum.io/rpc',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    usdg: USDG_ADDRESS,
  },
  // Base
  8453: { rpc: 'https://mainnet.base.org', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  // Optimism
  10: { rpc: 'https://mainnet.optimism.io', usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  // Polygon
  137: { rpc: 'https://polygon.llamarpc.com', usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  // Ethereum
  1: { rpc: 'https://cloudflare-eth.com', usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
};

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

export type CustomTokenBalance = {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  chainId: number;
};

export function getSwappedLedger(walletAddress: string | null): Record<string, number> {
  if (typeof window === 'undefined' || !walletAddress) return {};
  try {
    const raw = localStorage.getItem(`invisible_wallet_swapped_balances_${walletAddress.toLowerCase()}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordSwappedDelta(walletAddress: string, symbol: string, delta: number) {
  if (typeof window === 'undefined' || !walletAddress) return;
  try {
    const key = `invisible_wallet_swapped_balances_${walletAddress.toLowerCase()}`;
    const current = getSwappedLedger(walletAddress);
    const nextVal = Math.max(0, (Number(current[symbol]) || 0) + delta);
    current[symbol] = nextVal;
    localStorage.setItem(key, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('stylussafe-balance-updated'));
  } catch {
    // ignore storage errors
  }
}

export function useBalances(walletAddress: string | null, chainId: number = 421614) {
  const [usdgBalance, setUsdgBalance] = useState('0.00');
  const [ethBalance, setEthBalance] = useState('0.00');
  const [usdcBalance, setUsdcBalance] = useState('0.00');
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [customTokens, setCustomTokens] = useState<CustomTokenBalance[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refetch = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onUpdate = () => setRefreshTick((t) => t + 1);
    window.addEventListener('stylussafe-balance-updated', onUpdate);
    return () => window.removeEventListener('stylussafe-balance-updated', onUpdate);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const config = CHAIN_CONFIGS[chainId] || CHAIN_CONFIGS[421614];
    if (!config) return;

    const publicClient = createPublicClient({
      chain: { id: chainId } as any,
      transport: http(config.rpc),
    });

    const fetchBalances = async () => {
      if (!walletAddress) {
        setUsdgBalance('0.00');
        setEthBalance('0.00');
        setUsdcBalance('0.00');
        setTokenBalances({});
        return;
      }

      setIsFetching(true);
      setError(null);
      try {
        const [nativeBalRaw, usdc, usdgRaw] = await Promise.all([
          publicClient.getBalance({ address: walletAddress as `0x${string}` }).catch(() => BigInt(0)),
          publicClient
            .readContract({
              address: config.usdc,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [walletAddress as `0x${string}`],
            })
            .catch(() => BigInt(0)),
          config.usdg
            ? publicClient
                .readContract({
                  address: config.usdg,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [walletAddress as `0x${string}`],
                })
                .catch(() => BigInt(0))
            : Promise.resolve(BigInt(0)),
        ]);

        const savedTokens = JSON.parse(localStorage.getItem('custom_tokens') || '[]') as {
          address: string;
          chainId: number;
        }[];
        const chainTokens = savedTokens.filter((t) => t.chainId === chainId);

        const customResults = await Promise.all(
          chainTokens.map(async (t) => {
            try {
              const [symbol, decimals, bal] = await Promise.all([
                publicClient.readContract({
                  address: t.address as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'symbol',
                }),
                publicClient.readContract({
                  address: t.address as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'decimals',
                }),
                publicClient.readContract({
                  address: t.address as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [walletAddress as `0x${string}`],
                }),
              ]);
              return {
                address: t.address,
                symbol: symbol as string,
                decimals: decimals as number,
                balance: Number(formatUnits(bal as bigint, decimals as number)).toFixed(4),
                chainId,
              };
            } catch {
              return null;
            }
          })
        );

        if (isMounted) {
          const ledger = getSwappedLedger(walletAddress);
          const onChainEth = Number(formatEther(nativeBalRaw));
          const onChainUsdg = Number(formatUnits(usdgRaw as bigint, 6));
          const onChainUsdc = Number(formatUnits(usdc as bigint, 6));

          const totalEth = Math.max(0, onChainEth + (Number(ledger.ETH) || 0));
          // USDG is settled directly on-chain on Arbitrum Sepolia (421614); on other chains fall back to ledger if needed
          const totalUsdg = chainId === 421614 ? Math.max(0, onChainUsdg + (Number(ledger.USDG_LOCAL_DELTA) || 0)) : onChainUsdg;
          const totalUsdc = Math.max(0, onChainUsdc + (Number(ledger.USDC) || 0));

          const formattedNative = totalEth.toFixed(4);
          const formattedUsdg = totalUsdg.toFixed(2);
          const formattedUsdc = totalUsdc.toFixed(2);

          setUsdgBalance(formattedUsdg);
          setEthBalance(formattedNative);
          setUsdcBalance(formattedUsdc);
          setTokenBalances({
            USDG: formattedUsdg,
            USDC: formattedUsdc,
            ETH: formattedNative,
            ARB: Math.max(0, Number(ledger.ARB) || 0).toFixed(2),
            USDT: Math.max(0, Number(ledger.USDT) || 0).toFixed(2),
            DEGEN: Math.max(0, Number(ledger.DEGEN) || 0).toFixed(2),
            UNI: Math.max(0, Number(ledger.UNI) || 0).toFixed(2),
            WBTC: Math.max(0, Number(ledger.WBTC) || 0).toFixed(6),
          });
          setCustomTokens(customResults.filter(Boolean) as CustomTokenBalance[]);
        }
      } catch (err: any) {
        console.error('Failed to fetch balances:', err);
        if (isMounted) setError(err.message || 'Failed to fetch balances');
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [walletAddress, chainId, refreshTick]);

  const addCustomToken = (address: string) => {
    const saved = JSON.parse(localStorage.getItem('custom_tokens') || '[]');
    if (!saved.find((t: any) => t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId)) {
      saved.push({ address, chainId });
      localStorage.setItem('custom_tokens', JSON.stringify(saved));
      refetch();
    }
  };

  return { usdgBalance, ethBalance, usdcBalance, tokenBalances, customTokens, isFetching, error, refetch, addCustomToken };
}
