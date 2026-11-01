import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Patch mobile-app/src/app/(tabs)/transfer.tsx
const mobileTransferPath = resolve(__dirname, '..', 'mobile-app', 'src', 'app', '(tabs)', 'transfer.tsx');
let mobileTransfer = readFileSync(mobileTransferPath, 'utf8');
mobileTransfer = mobileTransfer.replace(
  /const SUPPORTED_TOKENS = \[\s*\{ symbol: 'USDG'[\s\S]*?\}\s*\];/m,
  `const SUPPORTED_TOKENS = [
  { symbol: 'USDG', address: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36', decimals: 6, name: 'Global Dollar', color: '#10B981' },
  { symbol: 'USDC', address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', decimals: 6, name: 'USD Coin', color: Colors.secondary },
  { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000', decimals: 18, name: 'Ether', color: Colors.primary },
  { symbol: 'WBTC', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 8, name: 'Wrapped Bitcoin', color: '#F7931A' },
];`
);
if (!mobileTransfer.includes('isSubmitting, setIsSubmitting')) {
  mobileTransfer = mobileTransfer.replace(
    /const \[customToToken, setCustomToToken\] = useState\(''\);/,
    `const [customToToken, setCustomToToken] = useState('');\n  const [isSubmitting, setIsSubmitting] = useState(false);`
  );
}
writeFileSync(mobileTransferPath, mobileTransfer, 'utf8');
console.log('✅ Patched mobile transfer.tsx');

// 2. Patch mobile-app/src/app/(tabs)/portfolio.tsx
const mobilePortfolioPath = resolve(__dirname, '..', 'mobile-app', 'src', 'app', '(tabs)', 'portfolio.tsx');
let mobilePortfolio = readFileSync(mobilePortfolioPath, 'utf8');
mobilePortfolio = mobilePortfolio.replace(/USDG \(Native\)/g, 'USDG');
writeFileSync(mobilePortfolioPath, mobilePortfolio, 'utf8');
console.log('✅ Patched mobile portfolio.tsx');

// 3. Patch mobile-app/src/app/(tabs)/session-keys.tsx
const mobileSessionPath = resolve(__dirname, '..', 'mobile-app', 'src', 'app', '(tabs)', 'session-keys.tsx');
let mobileSession = readFileSync(mobileSessionPath, 'utf8');
mobileSession = mobileSession.replace(
  /export default function SessionKeysScreen\(\) \{[\s\S]*?const handleGenerate = async \(\) => \{[\s\S]*?\};\n/m,
  `export default function SessionKeysScreen() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createSessionKey, revokeSessionKey } = useInvisibleWallet();

  const handleGenerate = async () => {
    setIsSubmitting(true);
    try {
      const res = await createSessionKey(8);
      if (res?.sessionKey) {
        Alert.alert('Session Key Generated', 'On-chain policy registered. Ephemeral session active for 8 hours.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Notice', 'Session key request prepared.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to generate session key');
    } finally {
      setIsSubmitting(false);
    }
  };
`
);
if (!mobileSession.includes('useInvisibleWallet')) {
  mobileSession = mobileSession.replace(
    /import { useState } from 'react';/,
    `import { useState } from 'react';\nimport { useInvisibleWallet } from '@/hooks/useInvisibleWallet';`
  );
}
writeFileSync(mobileSessionPath, mobileSession, 'utf8');
console.log('✅ Patched mobile session-keys.tsx');

// 4. Patch mobile-app/src/app/(tabs)/dca.tsx
const mobileDcaPath = resolve(__dirname, '..', 'mobile-app', 'src', 'app', '(tabs)', 'dca.tsx');
let mobileDca = readFileSync(mobileDcaPath, 'utf8');
mobileDca = mobileDca.replace(
  /export default function DCAScreen\(\) \{[\s\S]*?const handleCreate = async \(\) => \{[\s\S]*?\};\n/m,
  `export default function DCAScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [freqIndex, setFreqIndex] = useState(1);
  const { setupDCA } = useInvisibleWallet();

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const freqDays = freqIndex === 0 ? 1 : freqIndex === 1 ? 7 : 30;
      const amountRaw = 100n * 1_000_000n; // 100 USDC (6 decimals)
      await setupDCA('0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as \`0x\${string}\`, amountRaw, freqDays);
      Alert.alert('DCA Strategy Created', 'Recurring swap scheduled on-chain on StylusSafe.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('DCA Error', e?.message || 'Could not schedule DCA');
    } finally {
      setIsSubmitting(false);
    }
  };
`
);
if (!mobileDca.includes('useInvisibleWallet')) {
  mobileDca = mobileDca.replace(
    /import { useState } from 'react';/,
    `import { useState } from 'react';\nimport { useInvisibleWallet } from '@/hooks/useInvisibleWallet';`
  );
}
writeFileSync(mobileDcaPath, mobileDca, 'utf8');
console.log('✅ Patched mobile dca.tsx');

// 5. Patch mobile-app/src/app/(tabs)/intents.tsx
const mobileIntentsPath = resolve(__dirname, '..', 'mobile-app', 'src', 'app', '(tabs)', 'intents.tsx');
let mobileIntents = readFileSync(mobileIntentsPath, 'utf8');
mobileIntents = mobileIntents.replace(
  /export default function IntentsScreen\(\) \{[\s\S]*?const handleSignBatch = async \(\) => \{[\s\S]*?\};\n/m,
  `export default function IntentsScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { executeIntentBatch } = useInvisibleWallet();

  const handleSignBatch = async () => {
    setIsSubmitting(true);
    try {
      const intents = [
        { dest: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36', value: 0n, func: '0x' },
        { dest: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', value: 0n, func: '0x' },
      ];
      await executeIntentBatch(intents);
      Alert.alert('Batch Executed', 'Intent batch submitted to StylusSafe.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Batch Error', e?.message || 'Failed to submit batch');
    } finally {
      setIsSubmitting(false);
    }
  };
`
);
if (!mobileIntents.includes('useInvisibleWallet')) {
  mobileIntents = mobileIntents.replace(
    /import { useState } from 'react';/,
    `import { useState } from 'react';\nimport { useInvisibleWallet } from '@/hooks/useInvisibleWallet';`
  );
}
writeFileSync(mobileIntentsPath, mobileIntents, 'utf8');
console.log('✅ Patched mobile intents.tsx');

// 6. Patch web/src/app/transfer/page.tsx
const webTransferPath = resolve(__dirname, '..', 'web', 'src', 'app', 'transfer', 'page.tsx');
let webTransfer = readFileSync(webTransferPath, 'utf8');
webTransfer = webTransfer.replace(
  /const TOKENS = \[\s*\{ symbol: 'USDG'[\s\S]*?\}\s*\];/m,
  `const TOKENS = [
  { symbol: 'USDG', name: 'Global Dollar', address: '0xDa4D294858C44c83D72A0Cc6c1015A9e03A3BD36' as const, decimals: 6, color: '#10B981', isNative: false },
  { symbol: 'USDC', name: 'USD Coin', address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const, decimals: 6, color: '#2775CA', isNative: false },
  { symbol: 'ETH', name: 'Ether (Native)', address: '0x0000000000000000000000000000000000000000' as const, decimals: 18, color: '#0284c7', isNative: true },
  { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' as const, decimals: 18, color: '#28A0F0', isNative: false },
  { symbol: 'USDT', name: 'Tether USD', address: '0x26A17B80447A54F118804918e957597A81180800' as const, decimals: 6, color: '#26A17B', isNative: false },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0xF4B731445b20B9C06371b1A20A2786A76E8Ea47b' as const, decimals: 18, color: '#F4B731', isNative: false },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as const, decimals: 8, color: '#F7931A', isNative: false },
  { symbol: 'UNI', name: 'Uniswap', address: '0xFa7F8980b0f1E64A2062791ce3b0878370140fc2' as const, decimals: 18, color: '#FF007A', isNative: false },
  { symbol: 'LINK', name: 'Chainlink', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' as const, decimals: 18, color: '#2A5ADA', isNative: false },
];`
);
writeFileSync(webTransferPath, webTransfer, 'utf8');
console.log('✅ Patched web transfer page.tsx');

// 7. Patch web/src/app/trading/page.tsx
const webTradingPath = resolve(__dirname, '..', 'web', 'src', 'app', 'trading', 'page.tsx');
let webTrading = readFileSync(webTradingPath, 'utf8');
webTrading = webTrading.replace(
  /export default function TradingPage\(\) \{[\s\S]*?const handleAuthorize = async \(pin: string\) => \{[\s\S]*?finally \{[\s\S]*?\}\s*\};\n/m,
  `export default function TradingPage() {
  const { createSessionKey, setAgentPolicy, revokeSessionKey } = useInvisibleWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success' | 'revoking'>('idle');
  const [duration, setDuration] = useState<number>(4);
  const [targetContract, setTargetContract] = useState<string>('0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d');
  const [spendingCap, setSpendingCap] = useState<string>('500');

  const handleAuthorize = async (pin: string) => {
    setStatus('authorizing');
    try {
      const capRaw = BigInt(Math.floor(parseFloat(spendingCap || '500') * 1e6));
      const result = await setAgentPolicy({
        sessionKey: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as \`0x\${string}\`,
        durationHours: duration,
        maxPerTx: capRaw,
        dailyLimit: capRaw * 2n,
        allowedTarget: (targetContract.startsWith('0x') ? targetContract : '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d') as \`0x\${string}\`,
      }, pin);
      if (!result) throw new Error("Failed to set agent policy");
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('idle');
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleRevoke = async () => {
    setStatus('revoking');
    try {
      await revokeSessionKey();
      alert('Session policy successfully revoked on-chain.');
      setStatus('idle');
    } catch (e: any) {
      alert('Revocation failed: ' + e?.message);
      setStatus('idle');
    }
  };
`
);
writeFileSync(webTradingPath, webTrading, 'utf8');
console.log('✅ Patched web trading page.tsx');

