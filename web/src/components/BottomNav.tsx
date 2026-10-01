'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const getNavClass = (path: string) => {
    return pathname === path
      ? "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] text-accent-orange"
      : "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] text-text-muted hover:text-text-primary transition-colors";
  };

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-background-ink/90 backdrop-blur-xl border-t border-border-whisper pb-safe">
      <div className="flex justify-around items-center h-16 px-2 max-w-2xl mx-auto">
        <Link href="/" className={getNavClass('/')}>
          <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
          <span className="font-mono text-[10px] uppercase tracking-wider mt-1">Vault</span>
        </Link>
        <Link href="/transfer" className={getNavClass('/transfer')}>
          <span className="material-symbols-outlined text-[24px]">sync_alt</span>
          <span className="font-mono text-[10px] uppercase tracking-wider mt-1">Transfer</span>
        </Link>
        <Link href="/security" className={getNavClass('/security')}>
          <span className="material-symbols-outlined text-[24px]">shield</span>
          <span className="font-mono text-[10px] uppercase tracking-wider mt-1">Security</span>
        </Link>
        <Link href="/activity" className={getNavClass('/activity')}>
          <span className="material-symbols-outlined text-[24px]">receipt_long</span>
          <span className="font-mono text-[10px] uppercase tracking-wider mt-1">Activity</span>
        </Link>
      </div>
    </nav>
  );
}
