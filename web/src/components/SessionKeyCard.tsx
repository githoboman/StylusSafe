'use client';

import Link from 'next/link';

export function SessionKeyCard() {
  return (
    <div className="bg-surface-zinc rounded-[24px] p-5 shadow-sm border border-border-whisper space-y-4 hover:border-accent-azure/30 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-accent-azure text-[18px]">key</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">1-Click Trading</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">Authorize a temporary session key</p>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted bg-surface-container px-2 py-1 rounded">Inactive</span>
      </div>

      <div className="bg-surface-container-low rounded-xl p-3 border border-border-whisper flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Target DApp</span>
          <span className="text-xs font-medium text-text-primary">Uniswap V3</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Permissions</span>
          <span className="text-xs font-mono text-text-primary">Trade up to $500</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Duration</span>
          <span className="text-xs font-mono text-text-primary">4 Hours</span>
        </div>
      </div>

      <Link
        href="/trading"
        className="w-full h-11 bg-surface-container hover:bg-surface-container-high border border-border-whisper group-hover:border-accent-azure/50 active:scale-[0.98] transition-all rounded-[4px] flex items-center justify-center gap-2 font-medium text-sm text-text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        Manage Session Key
      </Link>
    </div>
  );
}
