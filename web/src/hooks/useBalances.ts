import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';

const CHAIN_CONFIGS: Record<number, { rpc: string, usdc: `0x${string}` }> = {
  // Arbitrum Sepolia
  421614: { rpc: 'https://arbitrum-sepolia.blockpi.network/v1/rpc/public', usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' },
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
  }
] as const;

export type CustomTokenBalance = {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  chainId: number;
};

export function useBalances(walletAddress: string | null, chainId: number = 421614) {
  const [ethBalance, setEthBalance] = useState('0.00');
  const [usdcBalance, setUsdcBalance] = useState('0.00');
  const [customTokens, setCustomTokens] = useState<CustomTokenBalance[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const config = CHAIN_CONFIGS[chainId];
    if (!config) return;

    const publicClient = createPublicClient({
      chain: { id: chainId } as any,
      transport: http(config.rpc),
    });

    const fetchBalances = async () => {
      if (!walletAddress) {
        setEthBalance('0.00');
        setUsdcBalance('0.00');
        return;
      }

      setIsFetching(true);
      setError(null);
      try {

      const [eth, usdc] = await Promise.all([
        publicClient.getBalance({ address: walletAddress as `0x${string}` }),
        publicClient.readContract({
          address: config.usdc,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        }).catch(() => 0n), // fallback if USDC doesn't exist on this chain
      ]);

      const savedTokens = JSON.parse(localStorage.getItem('custom_tokens') || '[]') as { address: string, chainId: number }[];
      const chainTokens = savedTokens.filter(t => t.chainId === chainId);

      const customResults = await Promise.all(chainTokens.map(async (t) => {
        try {
          const [symbol, decimals, bal] = await Promise.all([
            publicClient.readContract({ address: t.address as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }),
            publicClient.readContract({ address: t.address as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }),
            publicClient.readContract({ address: t.address as `0x${string}`, abi: ERC20_ABI, functionName: 'balanceOf', args: [walletAddress as `0x${string}`] }),
          ]);
          return {
            address: t.address,
            symbol: symbol as string,
            decimals: decimals as number,
            balance: Number(formatUnits(bal as bigint, decimals as number)).toLocaleString(undefined, { maximumFractionDigits: 4 }),
            chainId
          };
        } catch(e) { return null; }
      }));

        if (isMounted) {
          setEthBalance(Number(formatEther(eth)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
          setUsdcBalance(Number(formatUnits(usdc as bigint, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
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
    const interval = setInterval(fetchBalances, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [walletAddress, chainId]); 

  const refetch = () => {
    // A quick hack to allow manual refetch trigger (we can't easily expose the inner fetchBalances now)
    // For now we'll just let the interval handle it, or we could lift the client up.
  };

  const addCustomToken = (address: string) => {
    const saved = JSON.parse(localStorage.getItem('custom_tokens') || '[]');
    if (!saved.find((t: any) => t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId)) {
      saved.push({ address, chainId });
      localStorage.setItem('custom_tokens', JSON.stringify(saved));
      // Will be picked up on next poll
    }
  };

  return { ethBalance, usdcBalance, customTokens, isFetching, error, refetch, addCustomToken };
}
