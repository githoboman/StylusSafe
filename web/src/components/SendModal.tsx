import { useState } from 'react';
import { SignModal } from './SignModal';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances, USDG_ADDRESS } from '@/hooks/useBalances';
import { IconCheck, IconSend, IconAlert } from './Icons';

const TOKENS = [
  { symbol: 'USDG', name: 'Global Dollar', address: USDG_ADDRESS as `0x${string}`, decimals: 6, color: '#10B981', isNative: false },
  { symbol: 'USDC', name: 'USD Coin', address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`, decimals: 6, color: '#2775CA', isNative: false },
  { symbol: 'ETH', name: 'Ether', address: null, decimals: 18, color: '#0284c7', isNative: true },
  { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' as `0x${string}`, decimals: 18, color: '#28A0F0', isNative: false },
];

export function SendModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { address, sendTransaction } = useInvisibleWallet();
  const { usdgBalance, ethBalance, usdcBalance } = useBalances(address);
  
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSend = async (pin: string) => {
    try {
      const amountRaw = BigInt(Math.floor(parseFloat(amount) * 10 ** selectedToken.decimals));
      const result = await sendTransaction(
        selectedToken.address,
        amountRaw,
        recipient as `0x${string}`,
        pin
      );
      if (result) {
        setTxHash(result.userOpHash);
        setStatus('success');
        setAmount('');
        setRecipient('');
      } else {
        setStatus('error');
        setErrorMsg('Transaction failed — check console for details.');
      }
    } catch (e: any) {
      console.error('SendModal transfer failed:', e);
      setStatus('error');
      setErrorMsg(e?.message ?? 'Unknown error');
    } finally {
      setIsSignOpen(false);
    }
  };

  const getBalance = () => {
    if (selectedToken.symbol === 'USDG') return usdgBalance;
    if (selectedToken.symbol === 'USDC') return usdcBalance;
    return ethBalance;
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in font-sans">
        <div className="bg-[#141418] border border-white/[0.1] rounded-2xl p-8 max-w-md w-full shadow-2xl relative flex flex-col items-center text-white">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
            <IconCheck size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Sent Successfully</h2>
          <p className="text-[#8e8e98] text-xs text-center mb-6">Your transaction has been submitted to the bundler and will be confirmed shortly.</p>
          
          {txHash && (
            <div className="bg-[#0d0d10] rounded-lg p-3 w-full mb-6 border border-white/[0.06] flex flex-col gap-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#8e8e98]">Arbitrum Sepolia Tx Hash</span>
              <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-xs font-mono text-[#ff4500] truncate hover:underline">
                {txHash}
              </a>
            </div>
          )}
          
          <button 
            onClick={() => { setStatus('idle'); onClose(); }}
            className="w-full h-11 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-md font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in font-sans">
        <div className="bg-[#141418] border border-white/[0.1] rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-white">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-[#8e8e98] hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          
          <h2 className="text-2xl font-semibold text-text-primary mb-6 tracking-tight">Send</h2>
          
          {status === 'error' && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
              <IconAlert size={18} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-400 flex-1">{errorMsg}</span>
              <button onClick={() => setStatus('idle')} className="text-[#8e8e98] hover:text-white">✕</button>
            </div>
          )}

          <div className="flex flex-col gap-5">
            {/* Asset Selection */}
            <div className="flex gap-2">
              {TOKENS.map(t => (
                <button
                  key={t.symbol}
                  onClick={() => setSelectedToken(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-11 rounded-[4px] border text-xs sm:text-sm font-medium transition-all ${selectedToken.symbol === t.symbol ? 'border-accent-orange/50 bg-accent-orange/10 text-accent-orange' : 'border-border-whisper bg-surface-container text-text-muted hover:text-text-primary'}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span>{t.symbol}</span>
                  {t.isNative && <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-semibold">Native</span>}
                </button>
              ))}
            </div>

            {/* Recipient */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider">To</label>
              <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-3 focus-within:border-accent-orange transition-colors">
                <input
                  className="flex-1 bg-transparent h-12 text-sm text-text-primary font-mono outline-none placeholder:text-text-muted/50"
                  placeholder="0x..."
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex justify-between items-center">
                <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Amount</label>
                <button onClick={() => setAmount(getBalance())} className="font-mono text-[10px] text-accent-orange hover:underline">
                  Max: {getBalance()}
                </button>
              </div>
              <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-3 focus-within:border-accent-orange transition-colors">
                <input
                  className="flex-1 bg-transparent h-14 text-2xl text-text-primary font-semibold outline-none placeholder:text-text-muted/30"
                  placeholder="0.00"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="text-lg font-mono text-text-muted">{selectedToken.symbol}</span>
              </div>
            </div>

            <button
              onClick={() => setIsSignOpen(true)}
              disabled={!amount || !recipient || parseFloat(amount) <= 0}
              className="w-full h-12 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-sm"
            >
              <IconSend size={16} />
              <span>Send {selectedToken.symbol}</span>
            </button>
          </div>
        </div>
      </div>

      <SignModal 
        isOpen={isSignOpen}
        onClose={() => setIsSignOpen(false)}
        actionText={`Send ${selectedToken.symbol}`}
        amountText={`${amount} ${selectedToken.symbol}`}
        onSign={handleSend}
      />
    </>
  );
}
