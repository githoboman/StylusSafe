import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

const USDC_ADDRESS_ARB_SEPOLIA = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;

export function useBalances(walletAddress: string | null) {
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

    setIsFetching(true);
    setError(null);
    try {
      const publicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
      });

      const [eth, usdc] = await Promise.all([
        publicClient.getBalance({ address: walletAddress as `0x${string}` }),
        publicClient.readContract({
          address: USDC_ADDRESS_ARB_SEPOLIA,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        }),
      ]);

      setEthBalance(Number(formatEther(eth)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      setUsdcBalance(Number(formatUnits(usdc, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
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
  }, [walletAddress]); // Intentionally not including fetchBalances to avoid recreation loop unless memoized

  return { ethBalance, usdcBalance, isFetching, error, refetch: fetchBalances };
}
