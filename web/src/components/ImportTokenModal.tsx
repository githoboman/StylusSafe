import { useState } from 'react';
import { IconKey } from './Icons';

export function ImportTokenModal({ isOpen, onClose, onImport }: { isOpen: boolean; onClose: () => void; onImport: (address: string) => void }) {
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address && address.startsWith('0x')) {
      onImport(address);
      setAddress('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="bg-[#141418] w-full max-w-sm rounded-2xl p-6 border border-white/[0.1] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-white">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[#8e8e98] hover:text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        
        <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">Import Custom Token</h2>
        <p className="text-xs text-[#8e8e98] mb-5">Enter the 0x contract address of the token you want to track on this network.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center bg-[#0d0d10] rounded-lg border border-white/[0.08] px-3 focus-within:border-[#ff4500] transition-colors">
            <IconKey size={16} className="text-[#8e8e98] mr-2 shrink-0" />
            <input
              type="text"
              autoFocus
              className="flex-1 bg-transparent h-11 text-xs text-white font-mono outline-none placeholder:text-[#8e8e98]/50"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={!address.startsWith('0x')}
            className="h-11 w-full mt-1 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-lg font-semibold text-xs tracking-wide shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Import Token
          </button>
        </form>
      </div>
    </div>
  );
}
