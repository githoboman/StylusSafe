/**
 * env_loader.mjs
 *
 * Loads key=value pairs from process.env first, falling back to git-ignored
 * `secret.txt` / `secrets.txt` / `.env.local` in the repository root.
 * Never hardcode private keys or third-party API keys in source files.
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

export function loadLocalSecrets() {
  const candidates = [
    join(REPO_ROOT, 'secret.txt'),
    join(REPO_ROOT, 'secrets.txt'),
    join(REPO_ROOT, '.env.local'),
    join(REPO_ROOT, 'web', '.env.local'),
  ];

  const loaded = {};
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in loaded)) {
        loaded[key] = val;
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
  return loaded;
}

export function getRequiredSecret(name, fallbackNames = []) {
  loadLocalSecrets();
  const names = [name, ...fallbackNames];
  for (const n of names) {
    if (process.env[n]) return process.env[n];
  }
  throw new Error(
    `Missing required secret "${name}". Set it in environment variables or in git-ignored secret.txt.`
  );
}

