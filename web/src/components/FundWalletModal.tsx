import { useState } from 'react';
import { IconCheck } from './Icons';

export function FundWalletModal({ isOpen, onClose, address }: { isOpen: boolean, onClose: () => void, address: string | null }) {
  const [copied, setCopied] = useState(false);
  const [faucetStatus, setFaucetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [faucetMsg, setFaucetMsg] = useState('');

  if (!isOpen || !address) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimFaucet = async () => {
    setFaucetStatus('loading');
    setFaucetMsg('');
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount: 1000 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Faucet request failed');
      setFaucetStatus('success');
      setFaucetMsg(
        data.txHash
          ? `Minted 1,000 USDG on-chain (Tx: ${data.txHash.slice(0, 10)}...)! Balance will update shortly.`
          : 'Minted 1,000 USDG on-chain! Balance will update shortly.'
      );
    } catch (err: any) {
      setFaucetStatus('error');
      setFaucetMsg(err.message || 'Failed to claim testnet USDG');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in font-sans">
      <div className="bg-[#141418] border border-white/[0.1] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-white">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[#8e8e98] hover:text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold text-white tracking-tight">Receive USDG</h2>
          <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">ERC-20 Token</span>
        </div>
        <p className="text-[#8e8e98] text-xs mb-4 leading-relaxed">
          Deposit real USDG (Global Dollar, 6 decimals) or claim testnet tokens below.
        </p>

        {/* 1-Click Testnet Faucet Button */}
        <div className="bg-[#ff4500]/10 border border-[#ff4500]/30 rounded-xl p-3.5 mb-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff4500]" />
              <span className="text-xs font-semibold text-white">Arbitrum Sepolia Faucet</span>
            </div>
            <button
              onClick={handleClaimFaucet}
              disabled={faucetStatus === 'loading'}
              className="h-8 px-3 bg-[#ff4500] hover:bg-[#e03d00] disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-all shadow-sm"
            >
              {faucetStatus === 'loading' ? 'Minting...' : 'Claim 1,000 USDG'}
            </button>
          </div>
          {faucetMsg && (
            <p className={`text-xs ${faucetStatus === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {faucetMsg}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center bg-[#0d0d10] rounded-xl p-4 mb-5 border border-white/[0.06] relative">
          <div className="w-40 h-40 bg-white rounded-lg p-2 flex items-center justify-center shadow-md">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}&color=0f172a&bgcolor=ffffff`}
              alt="Wallet QR Code"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[11px] font-mono text-[#8e8e98] mt-2">Scan QR code to send USDG</span>
        </div>

        <div className="flex items-center justify-between bg-[#0d0d10] border border-white/[0.06] rounded-lg p-3 mb-4">
          <span className="font-mono text-xs text-white truncate mr-4 select-all">
            {address}
          </span>
          <button 
            onClick={handleCopy}
            className="shrink-0 h-8 px-3 flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-md text-xs font-medium transition-colors"
            title="Copy Address"
          >
            {copied ? <IconCheck size={14} className="text-emerald-400" /> : null}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <button 
          onClick={onClose}
          className="w-full h-11 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-lg text-xs transition-colors border border-white/[0.08]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
