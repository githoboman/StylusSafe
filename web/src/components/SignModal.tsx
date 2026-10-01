'use client';
import { useState, useEffect } from 'react';

type SignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSign?: (pin: string) => Promise<void>;
  actionText?: string;
  amountText?: string;
};

export function SignModal({ isOpen, onClose, onSign, actionText = "Bridge & Swap", amountText = "-1.50 ETH" }: SignModalProps) {
  const [pin, setPin] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError(null);
      setIsSigning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (num: number) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) return;
    
    setIsSigning(true);
    setError(null);
    try {
      if (onSign) {
        await onSign(pin);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setPin(''); // Reset PIN on error
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background-ink/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-surface-zinc rounded-[24px] border border-border-whisper shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-surface-container text-text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[24px]">dialpad</span>
          </div>
          
          <h3 className="text-xl font-semibold text-text-primary tracking-tight mb-1">Enter PIN</h3>
          <p className="text-sm text-text-muted mb-6">Authorize this transaction</p>
          
          <div className="w-full bg-surface-container rounded-[12px] p-4 mb-6 border border-border-whisper text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Action</span>
              <span className="text-sm font-medium text-text-primary">{actionText}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Amount</span>
              <span className="text-sm font-medium text-text-primary">{amountText}</span>
            </div>
          </div>
          
          {/* PIN Dots */}
          <div className="flex items-center justify-center gap-3 mb-8 h-8">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div 
                key={index} 
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  index < pin.length 
                    ? 'bg-accent-orange scale-110' 
                    : 'bg-surface-container-high'
                }`}
              />
            ))}
          </div>

          {error && (
             <div className="w-full py-2 mb-4 bg-error/10 text-red-400 text-sm rounded-[8px] font-medium border border-red-500/20">
               {error}
             </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                disabled={isSigning}
                className="h-14 rounded-[12px] bg-surface-container hover:bg-surface-container-high active:bg-surface-container-high/80 text-xl font-medium text-text-primary transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <div className="h-14"></div>
            <button
              onClick={() => handleKeyPress(0)}
              disabled={isSigning}
              className="h-14 rounded-[12px] bg-surface-container hover:bg-surface-container-high active:bg-surface-container-high/80 text-xl font-medium text-text-primary transition-colors flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={isSigning || pin.length === 0}
              className="h-14 rounded-[12px] bg-surface-container/50 hover:bg-surface-container text-text-muted hover:text-text-primary transition-colors flex items-center justify-center disabled:opacity-30"
            >
              <span className="material-symbols-outlined">backspace</span>
            </button>
          </div>
          
          <button 
            onClick={handleSubmit}
            disabled={isSigning || pin.length !== 6}
            className={`w-full h-14 rounded-[12px] font-semibold text-base transition-all flex items-center justify-center gap-2
              ${pin.length === 6 && !isSigning 
                ? 'bg-accent-orange hover:bg-accent-orange/90 text-white shadow-lg shadow-accent-orange/20' 
                : 'bg-surface-container text-text-muted cursor-not-allowed'}
            `}
          >
            {isSigning ? (
              <>
                <span className="w-5 h-5 border-2 border-border-whisper border-t-white rounded-full animate-spin"></span>
                Authorizing...
              </>
            ) : (
              'Confirm'
            )}
          </button>
          
          <button 
            onClick={onClose} 
            disabled={isSigning}
            className="mt-5 text-sm font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
