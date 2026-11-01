import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. mobile-app/src/app/index.tsx
const indexPath = resolve(__dirname, '..', 'mobile-app', 'src', 'app', 'index.tsx');
let indexCode = readFileSync(indexPath, 'utf8');
indexCode = indexCode.replace(/\/\(tabs\)\/portfolio/g, '/portfolio');
writeFileSync(indexPath, indexCode, 'utf8');
console.log('✅ Patched index.tsx');

// 2. mobile-app/src/components/app-tabs.web.tsx
const appTabsPath = resolve(__dirname, '..', 'mobile-app', 'src', 'components', 'app-tabs.web.tsx');
let appTabs = readFileSync(appTabsPath, 'utf8');
appTabs = appTabs.replace("href: '/explore'", "href: '/explore' as any");
writeFileSync(appTabsPath, appTabs, 'utf8');
console.log('✅ Patched app-tabs.web.tsx');

// 3. mobile-app/src/hooks/utils.ts
const utilsPath = resolve(__dirname, '..', 'mobile-app', 'src', 'hooks', 'utils.ts');
let utils = readFileSync(utilsPath, 'utf8');
utils = utils.replace('encryptedBytes', '(encryptedBytes as any)');
writeFileSync(utilsPath, utils, 'utf8');
console.log('✅ Patched utils.ts');

