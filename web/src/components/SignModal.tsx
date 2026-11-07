'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconCheck, IconFace, IconDialpad } from '@/components/Icons';
import FaceVerifyScanner from '@/components/faceverify/FaceVerifyScanner';

type SignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSign?: (pin: string) => Promise<void>;
  actionText?: string;
  amountText?: string;
  defaultMode?: 'faceid' | 'pin';
};

export function SignModal({
  isOpen,
  onClose,
  onSign,
  actionText = 'Authorize Transaction',
  amountText = 'Free / Sponsored Gas',
  defaultMode = 'faceid',
}: SignModalProps) {
  const [mode, setMode] = useState<'faceid' | 'pin'>(defaultMode);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError(null);
      setStatus('idle');
      setMode(defaultMode);
    }
  }, [isOpen, defaultMode]);

  const handleFaceVerified = useCallback(async () => {
    setStatus('scanning');
    setError(null);
    try {
      if (onSign) {
        await onSign('');
      }
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 950);
    } catch (err: any) {
      console.error('FaceVerify Signature Error:', err);
      setStatus('error');
      setError(err?.message || 'Cryptographic P-256 signature failed after FaceVerify liveness.');
    }
  }, [onSign, onClose]);

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

  const handlePinSubmit = async () => {
    if (pin.length !== 6) return;
    setStatus('scanning');
    setError(null);
    try {
      if (onSign) {
        await onSign(pin);
      }
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Authentication failed. Please verify your PIN.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#09090b]/85 backdrop-blur-md"
        onClick={status === 'scanning' ? undefined : onClose}
      />

      {/* Modal Surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-[#141418] rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden text-white max-h-[92vh] overflow-y-auto"
      >
        <div className="p-5 flex flex-col items-center text-center">

          {/* Header Bar */}
          <div className="w-full flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#ff4500]/15 border border-[#ff4500]/40 flex items-center justify-center text-[#ff4500] font-mono text-[10px] font-bold">
                FV
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white tracking-tight">
                  FaceVerify Neural Liveness
                </div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#8e8e98]">
                  MediaPipe 468-Landmark · RIP-7212 P-256
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono text-[9px] uppercase tracking-wider text-emerald-400">
              0x100 Enclave
            </span>
          </div>

          {/* Action & Amount Context Card */}
          <div className="w-full bg-[#0d0d10] rounded-xl p-3 mb-3.5 border border-white/[0.06] text-left space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#8e8e98] font-mono text-[10px] uppercase tracking-wider">Intent</span>
              <span className="text-white font-medium truncate max-w-[240px]">{actionText}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8e8e98] font-mono text-[10px] uppercase tracking-wider">Execution</span>
              <span className="text-white font-mono text-[11px] truncate max-w-[240px]">{amountText}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'faceid' ? (
              /* ── FaceVerify Optical Liveness View ─────────────────────────────── */
              <motion.div
                key="faceid-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col items-center"
              >
                <FaceVerifyScanner
                  onVerified={handleFaceVerified}
                  isSigning={status === 'scanning'}
                />

                {error && (
                  <div className="w-full py-2 px-3 mt-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                    {error}
                  </div>
                )}

                {status === 'success' && (
                  <div className="w-full py-2 px-3 mt-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center justify-center gap-2 font-mono">
                    <IconCheck size={15} />
                    <span>SIGNED VIA RIP-7212 P-256 PRECOMPILE</span>
                  </div>
                )}

                {/* Fallback to PIN */}
                <button
                  type="button"
                  onClick={() => setMode('pin')}
                  disabled={status === 'scanning'}
                  className="mt-3.5 text-xs text-[#8e8e98] hover:text-white transition-colors inline-flex items-center gap-1.5 font-mono"
                >
                  <IconDialpad size={14} />
                  <span>Use 6-digit PIN fallback instead</span>
                </button>
              </motion.div>
            ) : (
              /* ── 6-Digit PIN View ──────────────────────────────────────────────── */
              <motion.div
                key="pin-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#1b1b21] text-white flex items-center justify-center mb-2">
                  <IconDialpad size={18} />
                </div>

                <h3 className="text-lg font-semibold text-white tracking-tight mb-0.5">Enter Security PIN</h3>
                <p className="text-xs text-[#8e8e98] mb-4">AES-GCM PBKDF2 encrypted P-256 fallback</p>

                {/* PIN Dots */}
                <div className="flex items-center justify-center gap-3 mb-5 h-6">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-150 ${
                        index < pin.length
                          ? 'bg-[#ff4500] scale-110'
                          : 'bg-[#24242c]'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <div className="w-full py-1.5 px-3 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md">
                    {error}
                  </div>
                )}

                {/* Numeric Dialpad */}
                <div className="grid grid-cols-3 gap-1.5 w-full mb-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeyPress(num)}
                      disabled={status === 'scanning'}
                      className="h-11 rounded-lg bg-[#1b1b21] hover:bg-[#24242c] active:bg-[#2c2c36] text-base font-medium text-white transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      {num}
                    </button>
                  ))}
                  <div className="h-11" />
                  <button
                    type="button"
                    onClick={() => handleKeyPress(0)}
                    disabled={status === 'scanning'}
                    className="h-11 rounded-lg bg-[#1b1b21] hover:bg-[#24242c] active:bg-[#2c2c36] text-base font-medium text-white transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    disabled={status === 'scanning' || pin.length === 0}
                    className="h-11 rounded-lg bg-[#1b1b21]/60 hover:bg-[#1b1b21] text-[#8e8e98] hover:text-white transition-colors flex items-center justify-center disabled:opacity-30"
                  >
                    <span className="font-mono text-sm">DEL</span>
                  </button>
                </div>

                {/* PIN Confirm Button */}
                <button
                  type="button"
                  onClick={handlePinSubmit}
                  disabled={status === 'scanning' || pin.length !== 6}
                  className={`w-full h-11 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 ${
                    pin.length === 6 && status !== 'scanning'
                      ? 'bg-[#ff4500] hover:bg-[#e03d00] text-white shadow-md shadow-[#ff4500]/20'
                      : 'bg-[#1b1b21] text-[#8e8e98] cursor-not-allowed'
                  }`}
                >
                  {status === 'scanning' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    'Confirm with PIN'
                  )}
                </button>

                {/* Switch back to FaceVerify */}
                <button
                  type="button"
                  onClick={() => setMode('faceid')}
                  disabled={status === 'scanning'}
                  className="mt-3 text-xs text-[#8e8e98] hover:text-white transition-colors inline-flex items-center gap-1.5 font-mono"
                >
                  <IconFace size={15} />
                  <span>Switch back to FaceVerify Camera</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            disabled={status === 'scanning'}
            className="mt-3 text-xs font-mono text-[#8e8e98] hover:text-white transition-colors"
          >
            Cancel
          </button>

        </div>
      </motion.div>
    </div>
  );
}
