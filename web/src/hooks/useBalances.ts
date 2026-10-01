import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';

const CHAIN_CONFIGS: Record<number, { rpc: string, usdc: `0x${string}` }> = {
  // Arbitrum Sepolia
  421614: { rpc: 'https://sepolia-rollup.arbitrum.io/rpc', usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' },
  // Base
  8453: { rpc: 'https://mainnet.base.org', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  // Optimism
  10: { rpc: 'https://mainnet.optimism.io', usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  // Polygon
  137: { rpc: 'https://polygon-rpc.com', usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  // Ethereum
  1: { rpc: 'https://eth.llamarpc.com', usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
};

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;

export function useBalances(walletAddress: string | null, chainId: number = 421614) {
  const [ethBalance, setEthBalance] = useState('0.00');
  const [usdcBalance, setUsdcBalance] = useState('0.00');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!walletAddress) {
      setEthBalance('0.00');
      setUsdcBalance('0.00');
      return;
    }

    const config = CHAIN_CONFIGS[chainId];
    if (!config) return;

    setIsFetching(true);
    setError(null);
    try {
      const publicClient = createPublicClient({
        chain: { id: chainId } as any,
        transport: http(config.rpc),
      });

      const [eth, usdc] = await Promise.all([
        publicClient.getBalance({ address: walletAddress as `0x${string}` }),
        publicClient.readContract({
          address: config.usdc,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        }).catch(() => 0n), // fallback if USDC doesn't exist on this chain
      ]);

      setEthBalance(Number(formatEther(eth)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      setUsdcBalance(Number(formatUnits(usdc as bigint, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } catch (err: any) {
      console.error('Failed to fetch balances:', err);
      setError(err.message || 'Failed to fetch balances');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    // Poll every 15 seconds
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [walletAddress, chainId]); 

  return { ethBalance, usdcBalance, isFetching, error, refetch: fetchBalances };
}
