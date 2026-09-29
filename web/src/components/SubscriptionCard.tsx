'use client';

import Link from 'next/link';

export function SubscriptionCard() {
  return (
    <div className="bg-surface-zinc rounded-[24px] p-5 shadow-sm border border-border-whisper space-y-4 hover:border-accent-azure/30 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-accent-azure text-[18px]">autorenew</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Pull Payments</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">Automated Subscriptions</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl p-3 border border-border-whisper flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Merchant</span>
          <span className="text-xs font-medium text-text-primary">Web3 Netflix</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Allowance</span>
          <span className="text-xs font-mono text-text-primary">15.00 USDC</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Cycle</span>
          <span className="text-xs font-mono text-text-primary">Monthly</span>
        </div>
      </div>

      <Link
        href="/subscription"
        className="w-full h-11 bg-surface-container hover:bg-surface-container-high border border-border-whisper group-hover:border-accent-azure/50 active:scale-[0.98] transition-all rounded-[4px] flex items-center justify-center gap-2 font-medium text-sm text-text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        Manage Subscriptions
      </Link>
    </div>
  );
}
