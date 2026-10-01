import { useState } from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-zinc w-full max-w-sm rounded-[24px] p-6 border border-border-whisper shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-text-muted hover:text-text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
        
        <h2 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">Import Custom Token</h2>
        <p className="text-sm text-text-muted mb-6">Enter the 0x contract address of the token you want to track on this network.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center bg-surface-container-low rounded-[4px] border border-border-whisper px-4 focus-within:border-accent-orange transition-colors">
            <span className="material-symbols-outlined text-text-muted mr-3 text-[18px]">token</span>
            <input
              type="text"
              autoFocus
              className="flex-1 bg-transparent h-12 text-sm text-text-primary font-mono outline-none placeholder:text-text-muted/50"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={!address.startsWith('0x')}
            className="h-12 w-full mt-2 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-[4px] font-semibold tracking-wide shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Import Token
          </button>
        </form>
      </div>
    </div>
  );
}
