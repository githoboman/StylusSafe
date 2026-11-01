import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// utils.ts
const utilsPath = resolve(__dirname, '..', 'mobile-app', 'src', 'hooks', 'utils.ts');
let u = readFileSync(utilsPath, 'utf8');
u = u.replace('encryptedBytes\r\n        );', '(encryptedBytes as any)\r\n        );');
u = u.replace('encryptedBytes\n        );', '(encryptedBytes as any)\n        );');
writeFileSync(utilsPath, u, 'utf8');

// index.tsx
const indexPath = resolve(__dirname, '..', 'mobile-app', 'src', 'app', 'index.tsx');
let idx = readFileSync(indexPath, 'utf8');
idx = idx.replace("router.replace('/portfolio')", "router.replace('/portfolio' as any)");
idx = idx.replace("router.replace('/portfolio')", "router.replace('/portfolio' as any)");
writeFileSync(indexPath, idx, 'utf8');

// app-tabs.web.tsx
const appTabsPath = resolve(__dirname, '..', 'mobile-app', 'src', 'components', 'app-tabs.web.tsx');
let tabs = readFileSync(appTabsPath, 'utf8');
tabs = tabs.replace("href: '/explore'", "href: '/explore' as any");
writeFileSync(appTabsPath, tabs, 'utf8');

console.log('✅ Applied clean patches for mobile files');

