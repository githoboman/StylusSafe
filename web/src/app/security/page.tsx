'use client';

import { useState } from 'react';
import Link from 'next/link';

type Signer = {
  id: string;
  name: string;
  icon: string;
  date: string;
  active: boolean;
  type: 'passkey' | 'hardware' | 'software';
};

const INITIAL_SIGNERS: Signer[] = [
  { id: '1', name: 'My iPhone (Primary)', icon: 'smartphone', date: 'Added Oct 24, 2023', active: true, type: 'passkey' },
  { id: '2', name: 'Work MacBook', icon: 'laptop_mac', date: 'Added Oct 25, 2023', active: false, type: 'passkey' },
  { id: '3', name: 'Hardware Key (YubiKey)', icon: 'security_key', date: 'Added Nov 1, 2023', active: false, type: 'hardware' },
];

type SpendingLimit = { label: string; value: string; key: string };
const SPENDING_LIMITS: SpendingLimit[] = [
  { label: 'Daily Limit', value: '$5,000', key: 'daily' },
  { label: 'Per-Transaction Cap', value: '$1,000', key: 'per_tx' },
  { label: 'Session Key Cap', value: '$500', key: 'session' },
];

export default function SecurityPage() {
  const [signers, setSigners] = useState<Signer[]>(INITIAL_SIGNERS);
  const [threshold, setThreshold] = useState(3);
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [pendingThreshold, setPendingThreshold] = useState(3);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(true);
  const [addingKey, setAddingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [policySubmitted, setPolicySubmitted] = useState(false);

  const handleRemove = (id: string) => {
    if (confirmRemoveId === id) {
      setSigners(s => s.filter(x => x.id !== id));
      setConfirmRemoveId(null);
    } else {
      setConfirmRemoveId(id);
    }
  };

  const handleAddKey = () => {
    if (!newKeyName.trim()) return;
    setSigners(s => [...s, {
      id: Date.now().toString(),
      name: newKeyName.trim(),
      icon: 'devices',
      date: `Added ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      active: false,
      type: 'passkey',
    }]);
    setNewKeyName('');
    setAddingKey(false);
  };

  const handlePolicySave = () => {
    setThreshold(pendingThreshold);
    setEditingPolicy(false);
    setPolicySubmitted(true);
    setTimeout(() => setPolicySubmitted(false), 3000);
  };

  return (
    <div className="p-4 md:p-10 w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-400">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-whisper pb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold text-text-primary tracking-tight mb-1">Security Policies</h1>
            <p className="text-text-muted text-sm">Manage signers, approval thresholds, and session key permissions.</p>
          </div>
        </div>
        <button
          onClick={() => { setAddingKey(true); setNewKeyName(''); }}
          className="h-10 px-5 bg-accent-orange hover:bg-accent-orange/90 active:translate-y-[1px] text-white rounded-[4px] font-medium text-sm transition-all flex items-center gap-2 self-start md:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Signer
        </button>
      </div>

      {/* Policy Success Banner */}
      {policySubmitted && (
        <div className="flex items-center gap-3 bg-accent-orange/10 border border-accent-orange/30 rounded-[4px] p-4 animate-in zoom-in duration-300">
          <span className="material-symbols-outlined text-accent-orange">check_circle</span>
          <span className="text-sm text-accent-orange font-medium">Approval policy updated. Proposal sent to {threshold} existing signers for confirmation.</span>
        </div>
      )}

      {/* Approval Policy */}
      <div className="bg-surface-zinc rounded-[24px] border border-border-whisper overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div>
            <span className="text-text-primary font-semibold text-lg">Approval Policy</span>
            <p className="text-sm text-text-muted mt-1">
              Transactions require <strong className="text-text-primary">{threshold} of {signers.length}</strong> signers to confirm
            </p>
          </div>
          {!editingPolicy ? (
            <button
              onClick={() => { setEditingPolicy(true); setPendingThreshold(threshold); }}
              className="w-10 h-10 rounded-[4px] bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center text-text-primary border border-border-whisper"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          ) : null}
        </div>

        {editingPolicy && (
          <div className="border-t border-border-whisper p-6 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-300">
            <p className="text-sm text-text-muted">Required signatures: <span className="text-text-primary font-semibold font-mono">{pendingThreshold} of {signers.length}</span></p>
            <input
              type="range"
              min={1}
              max={signers.length}
              value={pendingThreshold}
              onChange={e => setPendingThreshold(Number(e.target.value))}
              className="w-full accent-[#0284c7]"
            />
            <div className="flex gap-3">
              <button onClick={handlePolicySave} className="h-10 px-5 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-[4px] text-sm font-medium transition-all" type="button">Save Policy</button>
              <button onClick={() => setEditingPolicy(false)} className="h-10 px-5 bg-surface-container hover:bg-surface-container-high text-text-primary rounded-[4px] text-sm border border-border-whisper transition-all" type="button">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Signer Form */}
      {addingKey && (
        <div className="bg-surface-zinc rounded-[24px] p-6 border border-accent-orange/30 animate-in slide-in-from-top-4 duration-300 flex flex-col gap-4">
          <span className="font-medium text-text-primary">Register New Passkey Signer</span>
          <input
            autoFocus
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddKey()}
            placeholder="e.g. Personal iPad, Security Key 2"
            className="w-full h-12 bg-surface-container-low border border-border-whisper rounded-[4px] px-4 text-text-primary placeholder:text-text-muted outline-none focus:border-accent-orange transition-colors"
          />
          <p className="text-xs text-text-muted">This will trigger a WebAuthn credential ceremony on the target device. The proposal requires approval from {threshold} existing signer(s) before becoming active.</p>
          <div className="flex gap-3">
            <button onClick={handleAddKey} className="h-10 px-5 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-[4px] text-sm font-medium transition-all" type="button">Register Device</button>
            <button onClick={() => setAddingKey(false)} className="h-10 px-5 bg-surface-container hover:bg-surface-container-high text-text-primary rounded-[4px] text-sm border border-border-whisper transition-all" type="button">Cancel</button>
          </div>
        </div>
      )}

      {/* Signers */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Authorized Signers</span>
          <span className="font-mono text-xs text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded-[4px]">{signers.length} Total</span>
        </div>
        <div className="flex flex-col gap-3">
          {signers.map((signer) => (
            <div key={signer.id} className="bg-surface-zinc rounded-[24px] p-5 border border-border-whisper flex items-center justify-between transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${signer.active ? 'bg-accent-orange/10 border border-accent-orange/20' : 'bg-surface-container border border-border-whisper'}`}>
                  <span className={`material-symbols-outlined text-[20px] ${signer.active ? 'text-accent-orange' : 'text-text-muted'}`}>{signer.icon}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-primary font-medium flex items-center gap-2 flex-wrap">
                    {signer.name}
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-[4px] font-mono ${signer.type === 'hardware' ? 'bg-text-muted/10 text-text-muted' : 'bg-accent-orange/10 text-accent-orange'}`}>
                      {signer.type === 'hardware' ? 'Hardware' : 'Passkey'}
                    </span>
                    {signer.active && <span className="flex items-center gap-1 text-[10px] text-accent-orange font-mono"><span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse"></span>This Device</span>}
                  </span>
                  <span className="font-mono text-xs text-text-muted mt-1">{signer.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {confirmRemoveId === signer.id ? (
                  <>
                    <button onClick={() => setConfirmRemoveId(null)} className="text-xs text-text-muted h-8 px-3 bg-surface-container rounded-[4px] border border-border-whisper hover:bg-surface-container-high transition-colors" type="button">Cancel</button>
                    <button onClick={() => handleRemove(signer.id)} className="text-xs text-white h-8 px-3 bg-red-600 hover:bg-red-700 rounded-[4px] transition-colors font-medium" type="button">Confirm Remove</button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRemove(signer.id)}
                    className="text-text-muted hover:text-red-400 transition-colors p-2"
                    type="button"
                    disabled={signer.active}
                    title={signer.active ? 'Cannot remove the current device' : 'Remove signer'}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Key */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs text-text-muted uppercase tracking-wider px-1">Session Key</span>
        <div className="bg-surface-zinc rounded-[24px] p-5 border border-border-whisper flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-text-primary font-semibold">Active Session</span>
            <span className="text-sm text-text-muted mt-1">
              {sessionActive ? 'Expires in 6h 42m — 1-click trading enabled' : 'No active session key. Create one from 1-Click Trading.'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {sessionActive && (
              <span className="font-mono text-xs text-accent-orange bg-accent-orange/10 px-2 py-1 rounded-[4px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse"></span>
                Active
              </span>
            )}
            {sessionActive ? (
              <button
                onClick={() => setSessionActive(false)}
                className="h-9 px-4 text-sm text-text-muted hover:text-red-400 transition-colors border border-border-whisper hover:border-red-400/40 rounded-[4px] bg-surface-container"
                type="button"
              >
                Revoke
              </button>
            ) : (
              <Link href="/trading" className="h-9 px-4 text-sm text-accent-orange border border-accent-orange/30 rounded-[4px] flex items-center hover:bg-accent-orange/10 transition-colors">
                Create Key
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Spending Limits */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs text-text-muted uppercase tracking-wider px-1">Spending Limits</span>
        <div className="bg-surface-zinc rounded-[24px] border border-border-whisper overflow-hidden">
          {SPENDING_LIMITS.map((limit, i) => (
            <div key={limit.key} className={`flex items-center justify-between px-5 py-4 ${i < SPENDING_LIMITS.length - 1 ? 'border-b border-border-whisper' : ''} hover:bg-black/[0.02] transition-colors group`}>
              <span className="text-sm text-text-muted">{limit.label}</span>
              <span className="font-mono text-sm text-text-primary font-medium">{limit.value} USDC</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-surface-container/40 rounded-[4px] p-5 border border-border-whisper flex items-start gap-3">
        <span className="material-symbols-outlined text-accent-orange text-[20px] shrink-0">info</span>
        <p className="text-sm text-text-muted leading-relaxed">
          Adding or removing a signer creates an on-chain governance proposal. It requires approval from <strong className="text-text-primary">{threshold}</strong> existing signers before taking effect. All operations are recorded immutably on Arbitrum Stylus.
        </p>
      </div>
    </div>
  );
}
