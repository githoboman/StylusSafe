'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconCheck, IconFace, IconFingerprint, IconDialpad } from '@/components/Icons';

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

  if (!isOpen) return null;

  const handleFaceIDAuth = async () => {
    setStatus('scanning');
    setError(null);
    try {
      if (onSign) {
        // Calling with empty string tells useInvisibleWallet to use native WebAuthn / Face ID
        await onSign('');
      }
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Face ID Error:', err);
      setStatus('error');
      setError(err?.message || 'Face ID authentication was cancelled or unavailable.');
    }
  };

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
        className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-md"
        onClick={status === 'scanning' ? undefined : onClose}
      />

      {/* Modal Surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm bg-[#141418] rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden text-white"
      >
        <div className="p-6 flex flex-col items-center text-center">

          {/* Action & Amount Context Card */}
          <div className="w-full bg-[#0d0d10] rounded-xl p-3.5 mb-5 border border-white/[0.06] text-left space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#8e8e98] font-mono text-[11px] uppercase tracking-wider">Action</span>
              <span className="text-white font-medium truncate max-w-[200px]">{actionText}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8e8e98] font-mono text-[11px] uppercase tracking-wider">Parameters</span>
              <span className="text-white font-mono text-[11px] truncate max-w-[200px]">{amountText}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'faceid' ? (
              /* ── Face ID Biometric View ────────────────────────────────────────── */
              <motion.div
                key="faceid-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col items-center"
              >
                {/* Biometric Scanner HUD Target */}
                <div className="relative w-28 h-28 my-2 flex items-center justify-center">
                  
                  {/* Corner Target Reticles */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white/40 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white/40 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white/40 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white/40 rounded-br-md" />

                  {/* Pulsing Center Biometric Glyphs */}
                  <div className="relative w-20 h-20 rounded-2xl bg-[#1b1b21] border border-white/[0.08] flex items-center justify-center overflow-hidden">
                    {status === 'success' ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-emerald-400"
                      >
                        <IconCheck size={36} />
                      </motion.div>
                    ) : (
                      <>
                        <div className={`transition-colors ${
                          status === 'scanning' ? 'text-[#ff4500]' : 'text-white/80'
                        }`}>
                          <IconFace size={38} />
                        </div>

                        {/* Animated Laser Sweep Line */}
                        {status === 'scanning' && (
                          <motion.div
                            animate={{ y: [-36, 36, -36] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#ff4500] to-transparent shadow-[0_0_12px_#ff4500]"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white tracking-tight mt-3 mb-1">
                  {status === 'scanning' && 'Scanning Face ID...'}
                  {status === 'success' && 'Biometrics Verified'}
                  {status === 'error' && 'Verification Needed'}
                  {status === 'idle' && 'Biometric Authentication'}
                </h3>
                <p className="text-xs text-[#8e8e98] mb-5 max-w-[240px]">
                  {status === 'scanning' && 'Hold device steady to authorize via Secure Enclave.'}
                  {status === 'success' && 'Signed with native RIP-7212 P-256 precompile.'}
                  {status === 'error' && (error || 'Please scan Face ID or switch to PIN.')}
                  {status === 'idle' && 'Authorize using Apple Face ID, Touch ID, or Windows Hello.'}
                </p>

                {/* Face ID Action Button */}
                <button
                  type="button"
                  onClick={handleFaceIDAuth}
                  disabled={status === 'scanning' || status === 'success'}
                  className="w-full h-12 rounded-lg bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.99] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff4500]/20 disabled:opacity-50"
                >
                  {status === 'scanning' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Biometrics...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <IconCheck size={16} />
                      <span>Authorized</span>
                    </>
                  ) : (
                    <>
                      <IconFingerprint size={16} />
                      <span>Authenticate with Face ID</span>
                    </>
                  )}
                </button>

                {/* Fallback to PIN */}
                <button
                  type="button"
                  onClick={() => setMode('pin')}
                  disabled={status === 'scanning'}
                  className="mt-4 text-xs text-[#8e8e98] hover:text-white transition-colors inline-flex items-center gap-1.5 font-mono"
                >
                  <IconDialpad size={14} />
                  <span>Use 6-digit PIN instead</span>
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
                <p className="text-xs text-[#8e8e98] mb-4">Fallback authentication method</p>

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

                {/* Switch back to Face ID */}
                <button
                  type="button"
                  onClick={() => setMode('faceid')}
                  disabled={status === 'scanning'}
                  className="mt-3 text-xs text-[#8e8e98] hover:text-white transition-colors inline-flex items-center gap-1.5 font-mono"
                >
                  <IconFace size={15} />
                  <span>Switch back to Face ID</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            disabled={status === 'scanning'}
            className="mt-4 text-xs font-mono text-[#8e8e98] hover:text-white transition-colors"
          >
            Cancel
          </button>

        </div>
      </motion.div>
    </div>
  );
}
