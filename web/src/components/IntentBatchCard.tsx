'use client';

import Link from 'next/link';

export function IntentBatchCard() {
  return (
    <div className="bg-surface-zinc rounded-[24px] p-5 shadow-sm border border-border-whisper space-y-4 hover:border-accent-azure/30 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-accent-azure text-[18px]">layers</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Intent Batching</h3>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">Atomic Multi-Action Execution</p>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent-azure bg-surface-container px-2 py-1 rounded">2 Txns</span>
      </div>

      <div className="bg-surface-container-low rounded-xl p-3 border border-border-whisper space-y-3">
        <div className="flex items-start gap-3 relative">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-azure mt-1.5 shrink-0 z-10" />
          <div className="absolute left-[3px] top-3 bottom-[-16px] w-[1px] bg-white/5" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-text-primary">Swap USDC to WETH</span>
            <span className="text-[10px] text-text-muted mt-0.5">Across Protocol Router</span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-azure mt-1.5 shrink-0 z-10" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-text-primary">Deposit WETH into Aave</span>
            <span className="text-[10px] text-text-muted mt-0.5">Aave V3 Pool</span>
          </div>
        </div>
      </div>

      <Link
        href="/intents"
        className="w-full h-11 bg-surface-container hover:bg-surface-container-high border border-border-whisper group-hover:border-accent-azure/50 active:scale-[0.98] transition-all rounded-[4px] flex items-center justify-center gap-2 font-medium text-sm text-text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        Manage Batch
      </Link>
    </div>
  );
}
