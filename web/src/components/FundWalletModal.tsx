import { useState } from 'react';

export function FundWalletModal({ isOpen, onClose, address }: { isOpen: boolean, onClose: () => void, address: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !address) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">Native Token</span>
        </div>
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          Deposit native USDG (Global Dollar) or multi-chain assets to your smart contract wallet address.
        </p>

        <div className="flex flex-col items-center bg-surface-container rounded-[16px] p-5 mb-5 border border-border-whisper relative">
          <div className="w-44 h-44 bg-white rounded-lg p-2 flex items-center justify-center shadow-md">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}&color=0f172a&bgcolor=ffffff`}
              alt="Wallet QR Code"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[11px] font-mono text-text-muted mt-3">Scan QR code to send native USDG</span>
        </div>

        <div className="flex items-center justify-between bg-surface-container border border-border-whisper rounded-[8px] p-3 mb-5">
          <span className="font-mono text-xs sm:text-sm text-text-primary truncate mr-4 select-all">
            {address}
          </span>
          <button 
            onClick={handleCopy}
            className="shrink-0 h-9 px-3 flex items-center gap-1.5 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-[4px] text-xs font-medium transition-colors"
            title="Copy Address"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="bg-surface-container/50 border border-border-whisper rounded-[8px] p-3.5 mb-4 text-xs text-text-muted space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-400 shrink-0 mt-0.5">verified</span>
            <span><strong className="text-text-primary">Native USDG Supported:</strong> Funds sent directly to this address will reflect immediately in your portfolio.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-accent-orange shrink-0 mt-0.5">bolt</span>
            <span><strong className="text-text-primary">Zero Gas:</strong> Receiving funds never costs gas. Outgoing transactions are sponsored.</span>
          </div>
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
