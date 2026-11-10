'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import {
  IconArrowLeft,
  IconFingerprint,
  IconShield,
  IconPlus,
  IconTrash,
  IconCheck,
  IconCpu,
} from '@/components/Icons';
import { unitsToUsdg, useOnChainAgentPolicy } from '@/lib/agentPolicy';

type SignerDevice = {
  id: string;
  name: string;
  type: 'passkey' | 'hardware' | 'agent';
  publicKeyPrefix: string;
  date: string;
  isCurrentDevice: boolean;
};

export default function SecurityPage() {
  const { address, revokeSessionKey, register, isPending } = useInvisibleWallet();
  const [signers, setSigners] = useState<SignerDevice[]>([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Real AI-helper allowance, read live from the smart account on Arbitrum Sepolia
  const { policy, loading: policyLoading, refresh: refreshPolicy } = useOnChainAgentPolicy(address);
  const hasAgentKey = !!policy && policy.isActive;
  const agentKeyAddress = policy?.sessionKey ?? '';
  const dailyCap = policy ? unitsToUsdg(policy.dailyLimit) : '0';
  const perTxCap = policy ? unitsToUsdg(policy.maxPerTx) : '0';
  const [revoking, setRevoking] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [addingKey, setAddingKey] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKeyId = localStorage.getItem('invisible_wallet_key_id');
      const storedPublicKey = localStorage.getItem('invisible_wallet_public_key');

      const initialDevices: SignerDevice[] = [
        {
          id: 'primary-device',
          name: storedKeyId?.includes('faceid')
            ? 'Device Biometric Passkey (Face & Fingerprint)'
            : 'Primary Hardware Passkey',
          type: 'passkey',
          publicKeyPrefix: storedPublicKey
            ? `${storedPublicKey.slice(0, 10)}...${storedPublicKey.slice(-6)}`
            : 'Not enrolled yet',
          date: 'Registered on Arbitrum',
          isCurrentDevice: true,
        },
      ];

      const savedSecondary = localStorage.getItem('stylussafe_backup_signers');
      if (savedSecondary) {
        try {
          const parsed = JSON.parse(savedSecondary);
          if (Array.isArray(parsed)) {
            initialDevices.push(...parsed);
          }
        } catch {
          // ignore
        }
      }

      setSigners(initialDevices);
    }
  }, [address]);

  const handleRegisterNewDevice = async () => {
    if (!newDeviceName.trim()) return;
    try {
      const result = await register(newDeviceName.trim(), undefined, 'biometric_prompt');
      const newDevice: SignerDevice = {
        id: 'device-' + Date.now(),
        name: newDeviceName.trim(),
        type: 'hardware',
        publicKeyPrefix: result?.walletAddress
          ? `${result.walletAddress.slice(0, 8)}...`
          : 'Pending confirmation',
        date: `Added ${new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`,
        isCurrentDevice: false,
      };

      const updated = [...signers, newDevice];
      setSigners(updated);
      localStorage.setItem(
        'stylussafe_backup_signers',
        JSON.stringify(updated.filter((d) => !d.isCurrentDevice))
      );
      setNewDeviceName('');
      setAddingKey(false);
      setStatusBanner(`Backup device "${newDevice.name}" added to your vault.`);
      setTimeout(() => setStatusBanner(null), 4000);
    } catch (err: any) {
      alert('Device registration cancelled: ' + err?.message);
    }
  };

  const handleRemoveDevice = (id: string) => {
    if (confirmRemoveId === id) {
      const updated = signers.filter((s) => s.id !== id);
      setSigners(updated);
      localStorage.setItem(
        'stylussafe_backup_signers',
        JSON.stringify(updated.filter((d) => !d.isCurrentDevice))
      );
      setConfirmRemoveId(null);
      setStatusBanner('Backup device removed.');
      setTimeout(() => setStatusBanner(null), 3000);
    } else {
      setConfirmRemoveId(id);
    }
  };

  const handlePanicRevoke = async () => {
    setRevoking(true);
    try {
      await revokeSessionKey();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('invisible_wallet_session_spent_today');
        localStorage.removeItem('invisible_wallet_session_last_reset');
      }
      await refreshPolicy();
      setStatusBanner('AI helper key turned off and confirmed on Arbitrum.');
      setTimeout(() => setStatusBanner(null), 4000);
    } catch (e: any) {
      alert('Revocation failed: ' + e?.message);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="p-5 sm:p-8 md:p-12 w-full max-w-4xl mx-auto space-y-8 sm:space-y-10 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-[#141418] hover:bg-white/[0.08] inline-flex items-center justify-center transition-colors text-zinc-400 hover:text-white border border-white/[0.08] shrink-0 mt-0.5"
            title="Back to Dashboard"
          >
            <IconArrowLeft size={17} />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Biometric Keys &amp; Security
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Manage the face, fingerprint, and hardware keys that unlock your wallet.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddingKey(true);
            setNewDeviceName('');
          }}
          className="h-11 px-5 bg-[#ff4500] hover:bg-[#e03d00] active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto shrink-0"
        >
          <IconPlus size={16} />
          <span>Add Backup Device</span>
        </button>
      </div>

      {/* Status Banner */}
      <AnimatePresence>
        {statusBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-[#141418] border border-white/[0.12] text-white text-sm font-medium inline-flex items-center gap-3 w-full"
          >
            <IconCheck size={17} className="text-[#ff4500]" />
            <span>{statusBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Backup Device Card */}
      {addingKey && (
        <div className="bg-[#141418] border border-[#ff4500]/40 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Add a Backup Phone or Laptop</h3>
            <p className="text-sm text-zinc-400">
              Scan your fingerprint or FaceID on a second device so you always have a backup key.
            </p>
          </div>

          <input
            type="text"
            autoFocus
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            placeholder="e.g. My Laptop, Backup iPhone, YubiKey"
            className="w-full h-12 bg-[#0d0d10] border border-white/[0.1] rounded-xl px-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#ff4500]"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRegisterNewDevice}
              disabled={isPending || !newDeviceName.trim()}
              className="h-11 px-5 bg-[#ff4500] hover:bg-[#e03d00] disabled:opacity-50 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-all"
            >
              {isPending ? 'Verifying Biometrics...' : 'Add Device'}
            </button>
            <button
              type="button"
              onClick={() => setAddingKey(false)}
              className="h-11 px-5 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Authorized Devices List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white">
            Your Authorized Devices ({signers.length})
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            Hardware secp256r1
          </span>
        </div>

        <div className="space-y-3">
          {signers.map((signer) => (
            <div
              key={signer.id}
              className="p-5 sm:p-6 bg-[#141418] border border-white/[0.08] rounded-2xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[#ff4500] inline-flex items-center justify-center shrink-0">
                  <IconFingerprint size={20} />
                </span>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold text-white truncate">
                      {signer.name}
                    </span>
                    {signer.isCurrentDevice && (
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-200 border border-white/[0.1]">
                        Current Device
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-zinc-400 truncate">
                    {signer.publicKeyPrefix} · {signer.date}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {confirmRemoveId === signer.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      className="h-9 px-3 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(signer.id)}
                      className="h-9 px-3.5 text-xs bg-white/[0.1] hover:bg-white/[0.18] text-white rounded-lg font-semibold transition-colors"
                    >
                      Confirm Remove
                    </button>
                  </div>
                ) : (
                  !signer.isCurrentDevice && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(signer.id)}
                      className="w-9 h-9 rounded-xl hover:bg-white/[0.06] text-zinc-400 hover:text-white inline-flex items-center justify-center transition-colors"
                      title="Remove device"
                    >
                      <IconTrash size={16} />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Helper Key Card */}
      <div className="bg-[#141418] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[#ff4500] inline-flex items-center justify-center shrink-0">
              <IconShield size={19} />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                AI Helper Allowance Key
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                Restricted session key for automated trading within your daily limit.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-zinc-300 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
            {hasAgentKey ? 'Active' : 'Off'}
          </span>
        </div>

        {hasAgentKey ? (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#0d0d10] rounded-2xl border border-white/[0.05] space-y-1">
                <span className="text-xs text-zinc-400">Helper Key</span>
                <div className="text-white font-mono font-medium truncate">
                  {agentKeyAddress.slice(0, 8)}...{agentKeyAddress.slice(-6)}
                </div>
              </div>
              <div className="p-4 bg-[#0d0d10] rounded-2xl border border-white/[0.05] space-y-1">
                <span className="text-xs text-zinc-400">Daily Limit</span>
                <div className="text-white font-mono font-semibold tabular-nums">
                  ${dailyCap} USDG
                </div>
              </div>
              <div className="p-4 bg-[#0d0d10] rounded-2xl border border-white/[0.05] space-y-1">
                <span className="text-xs text-zinc-400">Max Per Trade</span>
                <div className="text-white font-mono font-semibold tabular-nums">
                  ${perTxCap} USDG
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <span className="text-sm text-zinc-400">
                Want to stop the AI helper immediately? Turn off its key in one tap.
              </span>
              <button
                type="button"
                onClick={handlePanicRevoke}
                disabled={revoking}
                className="h-11 px-5 bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/[0.12] rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
              >
                <span>{revoking ? 'Turning Off...' : 'Turn Off AI Helper Key'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[#0d0d10] rounded-2xl text-center space-y-3">
            <p className="text-sm text-zinc-400">
              {!address
                ? 'Unlock your wallet to see your AI helper allowance.'
                : policyLoading
                  ? 'Checking your vault on Arbitrum Sepolia...'
                  : policy && !policy.isActive
                    ? 'Your last AI helper allowance has expired.'
                    : 'No AI helper key is active on your vault.'}
            </p>
            <Link
              href="/trading"
              className="h-10 px-5 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <span>Set AI Allowance Rules</span>
            </Link>
          </div>
        )}
      </div>

      {/* Hardware Cryptography Summary */}
      <div className="bg-[#141418] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
          <span className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 inline-flex items-center justify-center shrink-0">
            <IconCpu size={19} />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Hardware Enclave Details
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Verified on Arbitrum Sepolia via native precompile 0x0100.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm font-mono">
          <div className="p-4 bg-[#0d0d10] rounded-2xl border border-white/[0.05] space-y-1">
            <span className="text-zinc-400 text-xs">Vault Contract</span>
            <div className="text-white font-medium truncate">
              {address ? `${address.slice(0, 10)}...${address.slice(-6)}` : '0x0D666af6...32fA'}
            </div>
          </div>
          <div className="p-4 bg-[#0d0d10] rounded-2xl border border-white/[0.05] space-y-1">
            <span className="text-zinc-400 text-xs">RIP-7212 Verification</span>
            <div className="text-white font-medium">~3,450 Gas</div>
          </div>
          <div className="p-4 bg-[#0d0d10] rounded-2xl border border-white/[0.05] space-y-1">
            <span className="text-zinc-400 text-xs">Network</span>
            <div className="text-white font-medium">Arbitrum Sepolia</div>
          </div>
        </div>
      </div>
    </div>
  );
}
