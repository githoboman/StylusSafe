import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';

export const USDG_ADDRESS = '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' as const;
export const SWAP_POOL_ADDRESS = '0xD306521Ff547Ab4523f0a77cb9EaE53873be143b' as const;

export const SEPOLIA_SWAP_TOKENS = {
  USDG: { address: USDG_ADDRESS, decimals: 6, displayDecimals: 2 },
  USDC: { address: '0x120A29db0F1Dd3F479D99B8DaaCf6BD1070CA56e' as `0x${string}`, decimals: 6, displayDecimals: 2 },
  USDT: { address: '0xe5313FB74788cea60941dd0a171519cdCa14cCc6' as `0x${string}`, decimals: 6, displayDecimals: 2 },
  ETH: { address: '0x2e05ED11a050106E15ceF55b7938dEB6249B14cF' as `0x${string}`, decimals: 18, displayDecimals: 4 },
  ARB: { address: '0xa1AF657CEaF9566D21D7e596aeF923f368F5ead1' as `0x${string}`, decimals: 18, displayDecimals: 2 },
  UNI: { address: '0xEC09D28A2f790630Bb97DE8313DB904aaF6FB6b7' as `0x${string}`, decimals: 18, displayDecimals: 2 },
  WBTC: { address: '0x1aCa4D7bC53793c688d71e9061c19347EbAa8bC3' as `0x${string}`, decimals: 8, displayDecimals: 6 },
  DEGEN: { address: '0xd6d2f4258A23636d650Ee6dD22bFA1978C3827A0' as `0x${string}`, decimals: 18, displayDecimals: 2 },
} as const;

function resolveChainRpc(chainId: number, ssrFallback: string): string {
  return typeof window !== 'undefined' ? `${window.location.origin}/api/rpc?chainId=${chainId}` : ssrFallback;
}

const CHAIN_CONFIGS: Record<number, { rpc: string; usdc: `0x${string}`; usdg?: `0x${string}` }> = {
  // Arbitrum Sepolia - proxied via server route to avoid client key exposure
  421614: {
    rpc: resolveChainRpc(421614, 'https://sepolia-rollup.arbitrum.io/rpc'),
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    usdg: USDG_ADDRESS,
  },
  // Base
  8453: { rpc: resolveChainRpc(8453, 'https://mainnet.base.org'), usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  // Optimism
  10: { rpc: resolveChainRpc(10, 'https://mainnet.optimism.io'), usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  // Polygon
  137: { rpc: resolveChainRpc(137, 'https://polygon-rpc.com'), usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  // Ethereum
  1: { rpc: resolveChainRpc(1, 'https://ethereum-rpc.publicnode.com'), usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
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
        const poolEntries = Object.entries(SEPOLIA_SWAP_TOKENS) as Array<[
          keyof typeof SEPOLIA_SWAP_TOKENS,
          (typeof SEPOLIA_SWAP_TOKENS)[keyof typeof SEPOLIA_SWAP_TOKENS]
        ]>;

        const [nativeBalRaw, usdc, poolRaws] = await Promise.all([
          publicClient.getBalance({ address: walletAddress as `0x${string}` }).catch(() => BigInt(0)),
          publicClient
            .readContract({
              address: config.usdc,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [walletAddress as `0x${string}`],
            })
            .catch(() => BigInt(0)),
          chainId === 421614
            ? Promise.all(
                poolEntries.map(([, info]) =>
                  publicClient
                    .readContract({
                      address: info.address,
                      abi: ERC20_ABI,
                      functionName: 'balanceOf',
                      args: [walletAddress as `0x${string}`],
                    })
                    .catch(() => BigInt(0))
                )
              )
            : Promise.resolve(poolEntries.map(() => BigInt(0))),
        ]);

        const poolMap: Record<string, bigint> = {};
        poolEntries.forEach(([sym], idx) => {
          poolMap[sym] = (poolRaws[idx] as bigint) ?? BigInt(0);
        });

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
          const onChainEth = Number(formatEther(nativeBalRaw + (chainId === 421614 ? (poolMap.ETH ?? BigInt(0)) : BigInt(0))));
          const onChainUsdg = Number(formatUnits(chainId === 421614 ? (poolMap.USDG ?? BigInt(0)) : BigInt(0), 6));
          const onChainUsdc = Number(formatUnits((usdc as bigint) + (chainId === 421614 ? (poolMap.USDC ?? BigInt(0)) : BigInt(0)), 6));

          const formattedNative = Math.max(0, onChainEth).toFixed(4);
          const formattedUsdg = Math.max(0, onChainUsdg).toFixed(2);
          const formattedUsdc = Math.max(0, onChainUsdc).toFixed(2);

          const nextTokenBalances: Record<string, string> = {
            USDG: formattedUsdg,
            USDC: formattedUsdc,
            ETH: formattedNative,
          };
          for (const [sym, info] of poolEntries) {
            if (sym === 'USDG' || sym === 'USDC' || sym === 'ETH') continue;
            const rawBal = chainId === 421614 ? (poolMap[sym] ?? BigInt(0)) : BigInt(0);
            nextTokenBalances[sym] = Number(formatUnits(rawBal, info.decimals)).toFixed(info.displayDecimals);
          }

          setUsdgBalance(formattedUsdg);
          setEthBalance(formattedNative);
          setUsdcBalance(formattedUsdc);
          setTokenBalances(nextTokenBalances);
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
