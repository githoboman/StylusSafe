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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-zinc border border-border-whisper rounded-[24px] p-8 max-w-md w-full shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-text-muted hover:text-text-primary transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <h2 className="text-2xl font-semibold text-text-primary mb-2 tracking-tight">Fund Wallet</h2>
        <p className="text-text-muted text-sm mb-8 leading-relaxed">
          Send Arbitrum Sepolia ETH or USDC to your smart contract wallet address below to start executing gasless transactions.
        </p>

        <div className="flex flex-col items-center bg-surface-container rounded-[16px] p-6 mb-6 border border-border-whisper">
          {/* Simple CSS-based QR Code placeholder for demo purposes */}
          <div className="w-48 h-48 bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}&color=0f172a&bgcolor=ffffff`}
              alt="Wallet QR Code"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="flex items-center justify-between bg-surface-container border border-border-whisper rounded-[8px] p-3 mb-6">
          <span className="font-mono text-sm text-text-primary truncate mr-4 select-all">
            {address}
          </span>
          <button 
            onClick={handleCopy}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-background-ink hover:bg-black text-white rounded-[4px] transition-colors"
            title="Copy Address"
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <a 
            href="https://www.alchemy.com/faucets/arbitrum-sepolia" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full h-12 flex items-center justify-center gap-2 bg-accent-azure hover:bg-accent-azure/90 text-white font-medium rounded-[4px] transition-colors"
          >
            Get Testnet ETH <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </a>
        </div>
      </div>
    </div>
  );
}
