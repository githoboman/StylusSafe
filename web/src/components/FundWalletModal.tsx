import { useState } from 'react';

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
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Faucet request failed');
      setFaucetStatus('success');
      setFaucetMsg('Minted 1,000 USDG! Balance will update shortly.');
    } catch (err: any) {
      setFaucetStatus('error');
      setFaucetMsg(err.message || 'Failed to claim testnet USDG');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-surface-zinc border border-border-whisper rounded-[24px] p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-text-muted hover:text-text-primary transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Receive USDG</h2>
          <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">ERC-20 Token</span>
        </div>
        <p className="text-text-muted text-sm mb-4 leading-relaxed">
          Deposit real USDG (Global Dollar, 6 decimals) or claim testnet tokens below.
        </p>

        {/* 1-Click Testnet Faucet Button */}
        <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-[12px] p-3.5 mb-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-orange text-[20px]">water_drop</span>
              <span className="text-sm font-semibold text-text-primary">Arbitrum Sepolia Faucet</span>
            </div>
            <button
              onClick={handleClaimFaucet}
              disabled={faucetStatus === 'loading'}
              className="h-8 px-3 bg-accent-orange hover:bg-accent-orange/90 disabled:opacity-50 text-white rounded-[4px] text-xs font-semibold transition-all shadow-sm"
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

        <div className="flex flex-col items-center bg-surface-container rounded-[16px] p-4 mb-5 border border-border-whisper relative">
          <div className="w-40 h-40 bg-white rounded-lg p-2 flex items-center justify-center shadow-md">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}&color=0f172a&bgcolor=ffffff`}
              alt="Wallet QR Code"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[11px] font-mono text-text-muted mt-2">Scan QR code to send USDG</span>
        </div>

        <div className="flex items-center justify-between bg-surface-container border border-border-whisper rounded-[8px] p-3 mb-5">
          <span className="font-mono text-xs sm:text-sm text-text-primary truncate mr-4 select-all">
            {address}
          </span>
          <button 
            onClick={handleCopy}
            className="shrink-0 h-9 px-3 flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container text-text-primary border border-border-whisper rounded-[4px] text-xs font-medium transition-colors"
            title="Copy Address"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <button 
          onClick={onClose}
          className="w-full h-11 bg-surface-container hover:bg-surface-container-high text-text-primary font-medium rounded-[4px] text-sm transition-colors border border-border-whisper"
        >
          Done
        </button>
      </div>
    </div>
  );
}
