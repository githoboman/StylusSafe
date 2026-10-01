import { useState } from 'react';
import { SignModal } from './SignModal';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { useBalances } from '@/hooks/useBalances';

const TOKENS = [
  { symbol: 'ETH', name: 'Ether', address: null, decimals: 18, color: '#0284c7' },
  { symbol: 'USDC', name: 'USD Coin', address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`, decimals: 6, color: '#2775CA' },
];

export function SendModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { address, sendTransaction } = useInvisibleWallet();
  const { ethBalance, usdcBalance } = useBalances(address);
  
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
      setStatus('error');
      setErrorMsg(e?.message ?? 'Unknown error');
    } finally {
      setIsSignOpen(false);
    }
  };

  const getBalance = () => selectedToken.symbol === 'ETH' ? ethBalance : usdcBalance;

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-surface-zinc border border-border-whisper rounded-[24px] p-8 max-w-md w-full shadow-2xl relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-surface-container border border-border-whisper flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[32px] text-accent-azure">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Sent Successfully</h2>
          <p className="text-text-muted text-sm text-center mb-6">Your transaction has been submitted to the bundler and will be confirmed shortly.</p>
          
          {txHash && (
            <div className="bg-surface-container rounded-[8px] p-3 w-full mb-6 border border-border-whisper flex flex-col gap-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted">UserOp Hash</span>
              <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-sm font-mono text-accent-azure truncate hover:underline">
                {txHash}
              </a>
            </div>
          )}
          
          <button 
            onClick={() => { setStatus('idle'); onClose(); }}
            className="w-full h-12 bg-surface-container hover:bg-surface-container-high text-text-primary rounded-[4px] font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-surface-zinc border border-border-whisper rounded-[24px] p-6 max-w-md w-full shadow-2xl relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-text-muted hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          
          <h2 className="text-2xl font-semibold text-text-primary mb-6 tracking-tight">Send</h2>
          
          {status === 'error' && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-[4px] p-3 mb-6">
              <span className="material-symbols-outlined text-red-400 text-[18px]">error</span>
              <span className="text-xs text-red-400 flex-1">{errorMsg}</span>
              <button onClick={() => setStatus('idle')} className="text-text-muted hover:text-text-primary"><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>
          )}

          <div className="flex flex-col gap-5">
            {/* Asset Selection */}
            <div className="flex gap-2">
              {TOKENS.map(t => (
                <button
                  key={t.symbol}
                  onClick={() => setSelectedToken(t)}
                  className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-[4px] border text-sm font-medium transition-all ${selectedToken.symbol === t.symbol ? 'border-accent-azure/50 bg-accent-azure/10 text-accent-azure' : 'border-border-whisper bg-surface-container text-text-muted hover:text-text-primary'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.symbol}
                </button>
              ))}
            </div>

            {/* Recipient */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider">To</label>
              <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-3 focus-within:border-accent-azure transition-colors">
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
                <button onClick={() => setAmount(getBalance())} className="font-mono text-[10px] text-accent-azure hover:underline">
                  Max: {getBalance()}
                </button>
              </div>
              <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-3 focus-within:border-accent-azure transition-colors">
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
              className="w-full h-14 bg-accent-azure hover:bg-accent-azure/90 active:translate-y-[1px] disabled:opacity-40 text-white rounded-[4px] font-semibold text-base transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
              Send {selectedToken.symbol}
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
