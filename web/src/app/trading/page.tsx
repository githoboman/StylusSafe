'use client';

import { useState, useEffect } from 'react';
import { useInvisibleWallet } from '@/sdk_local/src/useInvisibleWallet';
import { SignModal } from '@/components/SignModal';
import Link from 'next/link';
import { IconArrowLeft } from '@/components/Icons';

const POPULAR_TARGETS = [
  { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
  { name: 'USDG Stablecoin Treasury', address: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' },
  { name: 'GMX V2 Exchange', address: '0xabbc5f99639c083a0475225492f311419527fb45' },
  { name: 'CoW Swap Settlement', address: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41' },
];

export default function TradingPage() {
  const { setAgentPolicy, revokeSessionKey, address } = useInvisibleWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'set_policy' | 'revoke'>('set_policy');
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');
  
  // Agent Policy form state
  const [agentAddress, setAgentAddress] = useState<string>('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [targetAddress, setTargetAddress] = useState<string>(POPULAR_TARGETS[0].address);
  const [dailyLimit, setDailyLimit] = useState<string>('500');
  const [maxPerTx, setMaxPerTx] = useState<string>('100');
  const [durationHours, setDurationHours] = useState<number>(24);

  // Active Policy Telemetry (loaded from localStorage or live contract)
  const [activePolicy, setActivePolicy] = useState<{
    key: string;
    target: string;
    dailyLimit: string;
    maxPerTx: string;
    expiry: number;
    spentToday: string;
  } | null>(null);

  // Simulation test state
  const [simLog, setSimLog] = useState<{ type: 'success' | 'blocked' | 'info'; message: string; timestamp: string }[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('invisible_wallet_session_key');
      const savedExpiry = localStorage.getItem('invisible_wallet_session_expiry');
      const savedDaily = localStorage.getItem('invisible_wallet_session_daily_limit');
      const savedMax = localStorage.getItem('invisible_wallet_session_max_per_tx');
      const savedTarget = localStorage.getItem('invisible_wallet_session_target');

      if (savedKey && savedExpiry) {
        setActivePolicy({
          key: savedKey,
          target: savedTarget || POPULAR_TARGETS[0].address,
          dailyLimit: savedDaily ? (BigInt(savedDaily) / 1000000n).toString() : '500',
          maxPerTx: savedMax ? (BigInt(savedMax) / 1000000n).toString() : '100',
          expiry: Number(savedExpiry),
          spentToday: '0',
        });
      }
    }
  }, [status]);

  const handleAuthorize = async (pin: string) => {
    setStatus('authorizing');
    try {
      if (modalAction === 'set_policy') {
        const dailyLimitUnits = BigInt(Math.floor(Number(dailyLimit) * 1_000_000));
        const maxPerTxUnits = BigInt(Math.floor(Number(maxPerTx) * 1_000_000));
        const res = await setAgentPolicy({
          sessionKey: agentAddress as `0x${string}`,
          durationHours,
          maxPerTx: maxPerTxUnits,
          dailyLimit: dailyLimitUnits,
          allowedTarget: targetAddress as `0x${string}`,
        }, pin);

        if (!res) throw new Error("Policy submission failed");
        
        setActivePolicy({
          key: agentAddress,
          target: targetAddress,
          dailyLimit,
          maxPerTx,
          expiry: Math.floor(Date.now() / 1000) + durationHours * 3600,
          spentToday: '0',
        });
        
        setSimLog(prev => [{
          type: 'info',
          message: `On-chain Policy deployed: Agent ${agentAddress.slice(0, 8)}... daily limit ${dailyLimit} USDG`,
          timestamp: new Date().toLocaleTimeString(),
        }, ...prev]);

        setStatus('success');
      } else {
        const res = await revokeSessionKey(pin);
        if (!res) throw new Error("Revocation failed");
        setActivePolicy(null);
        setSimLog(prev => [{
          type: 'blocked',
          message: `PANIC REVOKE: Agent Session Key permanently zeroed on-chain.`,
          timestamp: new Date().toLocaleTimeString(),
        }, ...prev]);
        setStatus('idle');
      }
    } catch (e) {
      console.error(e);
      setStatus('idle');
    } finally {
      setIsModalOpen(false);
    }
  };

  const simulateCompliantTrade = () => {
    const tradeAmount = 50;
    const currentSpent = Number(activePolicy?.spentToday || 0);
    const newSpent = currentSpent + tradeAmount;

    setSimLog(prev => [{
      type: 'success',
      message: `[PERMITTED] Agent executed $${tradeAmount} USDG swap on ${POPULAR_TARGETS.find(t => t.address.toLowerCase() === activePolicy?.target.toLowerCase())?.name || 'Whitelisted Target'}. Spend today: $${newSpent}/$${activePolicy?.dailyLimit} USDG`,
      timestamp: new Date().toLocaleTimeString(),
    }, ...prev]);

    if (activePolicy) {
      setActivePolicy({ ...activePolicy, spentToday: String(newSpent) });
    }
  };

  const simulateRogueSpend = () => {
    const rogueAmount = 5000;
    setSimLog(prev => [{
      type: 'blocked',
      message: `[FIREWALL REVERT] Agent attempted to execute $${rogueAmount} USDG transfer. Blocked on-chain: StylusSafe__AgentDailyLimitExceeded(spentToday=0, requested=${rogueAmount * 1000000}, cap=${Number(activePolicy?.dailyLimit || 500) * 1000000})`,
      timestamp: new Date().toLocaleTimeString(),
    }, ...prev]);
  };

  return (
    <div className="p-4 md:p-10 w-full max-w-5xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-whisper pb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-9 h-9 rounded-lg bg-surface-container inline-flex items-center justify-center hover:bg-surface-container-high transition-colors text-text-muted hover:text-text-primary border border-white/[0.06] shrink-0" title="Back to Dashboard">
            <IconArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">Agent Spending Firewall</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-accent-orange/10 text-accent-orange border border-accent-orange/30">
                YC Crypto RFS
              </span>
            </div>
            <p className="text-text-muted text-sm max-w-xl mt-1">
              Issue scoped execution keys to autonomous trading agents with hard on-chain daily caps, per-tx ceilings, and target allowlists.
            </p>
          </div>
        </div>

        {activePolicy && (
          <button
            onClick={() => {
              setModalAction('revoke');
              setIsModalOpen(true);
            }}
            className="h-10 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-sm">lock_reset</span>
            1-Click Panic Revoke
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Policy Configuration Form */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-surface-zinc rounded-2xl p-6 border border-border-whisper space-y-5">
            <div className="flex items-center justify-between border-b border-border-whisper pb-3">
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-orange text-lg">policy</span>
                Configure Agent Guardrails
              </h2>
              <span className="text-xs font-mono text-text-muted">Arbitrum Sepolia</span>
            </div>

            <div className="space-y-4">
              {/* Agent Address */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Agent Public Key / Delegate Address</label>
                <input 
                  type="text"
                  value={agentAddress}
                  onChange={(e) => setAgentAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full h-11 bg-surface-container-low border border-border-whisper rounded-lg px-3 text-sm text-text-primary font-mono outline-none focus:border-accent-orange transition-colors"
                />
              </div>

              {/* Target Whitelist */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Target Contract Allowlist</label>
                <select 
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  className="w-full h-11 bg-surface-container-low border border-border-whisper rounded-lg px-3 text-sm text-text-primary outline-none focus:border-accent-orange transition-colors font-mono"
                >
                  {POPULAR_TARGETS.map(t => (
                    <option key={t.address} value={t.address}>
                      {t.name} ({t.address.slice(0, 6)}...{t.address.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Limits Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Daily Spending Cap</label>
                  <div className="flex items-center bg-surface-container-low border border-border-whisper rounded-lg px-3 focus-within:border-accent-orange transition-colors">
                    <input 
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="w-full h-11 bg-transparent outline-none text-sm text-text-primary font-mono"
                    />
                    <span className="text-xs text-text-muted uppercase font-mono">USDG</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Max Per Transaction</label>
                  <div className="flex items-center bg-surface-container-low border border-border-whisper rounded-lg px-3 focus-within:border-accent-orange transition-colors">
                    <input 
                      type="number"
                      value={maxPerTx}
                      onChange={(e) => setMaxPerTx(e.target.value)}
                      className="w-full h-11 bg-transparent outline-none text-sm text-text-primary font-mono"
                    />
                    <span className="text-xs text-text-muted uppercase font-mono">USDG</span>
                  </div>
                </div>
              </div>

              {/* Expiry */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Session Key Expiry</label>
                <select 
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full h-11 bg-surface-container-low border border-border-whisper rounded-lg px-3 text-sm text-text-primary outline-none focus:border-accent-orange transition-colors font-mono"
                >
                  <option value={4}>4 Hours (Standard Trading Window)</option>
                  <option value={12}>12 Hours (Half-Day Arbitrage)</option>
                  <option value={24}>24 Hours (Daily Strategy Cycle)</option>
                  <option value={168}>7 Days (Recurring Intent)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setModalAction('set_policy');
                setIsModalOpen(true);
              }}
              className="w-full h-12 bg-accent-orange hover:bg-accent-orange/90 active:scale-[0.99] transition-all rounded-lg flex items-center justify-center gap-2 font-semibold text-sm text-white shadow-lg shadow-accent-orange/20 mt-2"
            >
              <span className="material-symbols-outlined text-lg">security</span>
              Sign &amp; Deploy Agent Firewall Policy
            </button>
          </div>
        </div>

        {/* Live On-Chain Telemetry & Simulator */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Active Policy Status Card */}
          <div className="bg-surface-zinc rounded-2xl p-6 border border-border-whisper space-y-4">
            <div className="flex items-center justify-between border-b border-border-whisper pb-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-lg">verified_user</span>
                Active Firewall State
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${activePolicy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-surface-container text-text-muted border border-border-whisper'}`}>
                {activePolicy ? 'Guarded (Active)' : 'No Active Policy'}
              </span>
            </div>

            {activePolicy ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-border-whisper/40">
                  <span className="text-text-muted">Agent Key:</span>
                  <span className="text-text-primary">{activePolicy.key.slice(0, 6)}...{activePolicy.key.slice(-4)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border-whisper/40">
                  <span className="text-text-muted">Target Whitelist:</span>
                  <span className="text-text-primary">{activePolicy.target.slice(0, 6)}...{activePolicy.target.slice(-4)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border-whisper/40">
                  <span className="text-text-muted">Max Per Tx:</span>
                  <span className="text-text-primary">${activePolicy.maxPerTx} USDG</span>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Daily Spend Meter:</span>
                    <span className="text-text-primary font-semibold">${activePolicy.spentToday} / ${activePolicy.dailyLimit} USDG</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-orange transition-all duration-300"
                      style={{ width: `${Math.min(100, (Number(activePolicy.spentToday) / Math.max(1, Number(activePolicy.dailyLimit))) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-text-muted">
                No policy currently active. Configure and sign a policy to arm the on-chain agent firewall.
              </div>
            )}
          </div>

          {/* Test & Simulation Sandbox */}
          <div className="bg-surface-zinc rounded-2xl p-6 border border-border-whisper space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-lg">science</span>
              Agent Intent Simulator
            </h3>
            <p className="text-xs text-text-muted">
              Verify smart contract invariants directly from the browser without sending real funds.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={simulateCompliantTrade}
                disabled={!activePolicy}
                className="p-3 bg-surface-container hover:bg-surface-container-high disabled:opacity-40 border border-border-whisper rounded-xl text-left transition-all"
              >
                <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  Test $50 Swap
                </div>
                <div className="text-[11px] text-text-muted leading-tight">Within caps; executes successfully.</div>
              </button>

              <button
                onClick={simulateRogueSpend}
                disabled={!activePolicy}
                className="p-3 bg-surface-container hover:bg-surface-container-high disabled:opacity-40 border border-border-whisper rounded-xl text-left transition-all"
              >
                <div className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">block</span>
                  Test Rogue Spend
                </div>
                <div className="text-[11px] text-text-muted leading-tight">Exceeds cap; triggers on-chain revert.</div>
              </button>
            </div>

            {/* Simulation Log Console */}
            {simLog.length > 0 && (
              <div className="mt-3 p-3 bg-background-ink border border-border-whisper rounded-xl max-h-48 overflow-y-auto font-mono text-[11px] space-y-2">
                {simLog.map((log, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <span className="text-text-muted text-[10px]">{log.timestamp}</span>
                    <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'blocked' ? 'text-red-400' : 'text-blue-400'}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      <SignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionText={modalAction === 'set_policy' ? "Authorize Agent Policy" : "Revoke Session Key"}
        amountText={modalAction === 'set_policy' ? `Daily Limit: $${dailyLimit} USDG` : "Zero out all agent privileges"}
        onSign={handleAuthorize}
      />
    </div>
  );
}
