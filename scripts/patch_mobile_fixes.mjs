import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Patch mobile-app/src/hooks/utils.ts
const mobileUtilsPath = resolve(__dirname, '..', 'mobile-app', 'src', 'hooks', 'utils.ts');
let mobileUtils = readFileSync(mobileUtilsPath, 'utf8');
mobileUtils = mobileUtils.replace('salt: salt,', 'salt: salt as any,');
mobileUtils = mobileUtils.replace('{ name: "AES-GCM", iv: ivBytes },', '{ name: "AES-GCM", iv: ivBytes as any },');
mobileUtils = mobileUtils.replace('encryptedBytes\n        );', '(encryptedBytes as any)\n        );');
writeFileSync(mobileUtilsPath, mobileUtils, 'utf8');
console.log('✅ Patched mobile utils.ts');

// 2. Patch mobile-app/src/app/(tabs)/activity.tsx
const mobileActivityPath = resolve(__dirname, '..', 'mobile-app', 'src', 'app', '(tabs)', 'activity.tsx');
let mobileActivity = readFileSync(mobileActivityPath, 'utf8');
mobileActivity = mobileActivity.replace(
  "tx.type === 'Bridge' ? 'arrow-up-right' : tx.type === 'Receive' ? 'arrow-down-left'",
  "tx.type === 'Bridge' ? 'arrow-up' : tx.type === 'Receive' ? 'arrow-down'"
);
writeFileSync(mobileActivityPath, mobileActivity, 'utf8');
console.log('✅ Patched mobile activity.tsx');

// 3. Patch mobile-app/src/hooks/useInvisibleWallet.ts executeCrossChainSwap arg types
const mobileHookPath = resolve(__dirname, '..', 'mobile-app', 'src', 'hooks', 'useInvisibleWallet.ts');
let mobileHook = readFileSync(mobileHookPath, 'utf8');
mobileHook = mobileHook.replace(
  /executeCrossChainSwap: \([\s\S]*?\) => Promise<{ userOpHash: string } \| null>;/m,
  `executeCrossChainSwap: (
        arg1: number,
        arg2: any,
        arg3: any,
        arg4: any,
        arg5?: any,
        arg6?: any,
        arg7?: any
    ) => Promise<{ userOpHash: string } | null>;`
);
writeFileSync(mobileHookPath, mobileHook, 'utf8');
console.log('✅ Patched mobile useInvisibleWallet.ts');

