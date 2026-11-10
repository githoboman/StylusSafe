import {
  OPENBR_MATCH_THRESHOLD,
  computeTemplateHash,
  getEnrolledBiometricTemplate,
  type OpenBRTemplate,
} from './openbrEngine';

/**
 * Biometric Enclave Vault Registry
 *
 * Ensures that a user's Face ID (64-D OpenBR Craniofacial Template) and/or
 * Fingerprint / Hardware BiometricPrompt (WebAuthn PublicKeyCredential ID)
 * persistently HOLDS and RECOVERS their deterministic Arbitrum Stylus wallet
 * across disconnects, sign-ins, and multi-user sessions.
 */

export type BiometricVaultEntry = {
  walletAddress: string;
  publicKeyHex: string;
  encryptedJwk: string;
  iv: string;
  mode: 'webauthn' | 'pin';
  faceDescriptor: number[] | null;
  faceTemplateHash: string | null;
  hardwareCredentialId: string | null;
  createdAt: string;
  lastAccessedAt: string;
};

const REGISTRY_STORAGE_KEY = 'stylussafe_biometric_vault_registry_v1';
const LAST_ENROLLED_DESC_KEY = 'stylussafe_last_face_probe_v1';

export function loadVaultRegistry(): BiometricVaultEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVaultRegistry(entries: BiometricVaultEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Computes OpenBR similarity between two 64-D normalized craniofacial descriptors.
 */
export function compareFaceDescriptors(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length !== 64) return 0;
  let dot = 0;
  let distSq = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    const diff = a[i] - b[i];
    distSq += diff * diff;
  }
  const distance = Math.sqrt(distSq);
  const calibratedSim = Math.max(0, Math.min(1, 1 - distance * 0.85));
  const rawCosine = Math.max(0, Math.min(1, dot));
  return Number((calibratedSim * 0.75 + rawCosine * 0.25).toFixed(4));
}

/**
 * Finds the wallet vault held by a specific person's 64-D OpenBR Face Descriptor.
 */
export function findVaultByFaceDescriptor(
  probeDescriptor: number[],
): { entry: BiometricVaultEntry; similarity: number } | null {
  const registry = loadVaultRegistry();
  let bestMatch: { entry: BiometricVaultEntry; similarity: number } | null = null;

  for (const entry of registry) {
    if (!entry.faceDescriptor || entry.faceDescriptor.length !== 64) continue;
    const sim = compareFaceDescriptors(probeDescriptor, entry.faceDescriptor);
    if (sim >= OPENBR_MATCH_THRESHOLD) {
      if (!bestMatch || sim > bestMatch.similarity) {
        bestMatch = { entry, similarity: sim };
      }
    }
  }

  return bestMatch;
}

/**
 * Finds the wallet vault held by a Hardware Fingerprint / FaceID Passkey credential ID.
 */
export function findVaultByHardwareCredentialId(
  credentialId: string,
): BiometricVaultEntry | null {
  if (!credentialId) return null;
  const registry = loadVaultRegistry();
  return registry.find((e) => e.hardwareCredentialId === credentialId) ?? null;
}

/**
 * Stores the most recent verified/enrolled 64-D face descriptor in session memory
 * so register() and login() can bind or look up the exact face-owned vault.
 */
export function setLastVerifiedFaceDescriptor(descriptor: number[]): void {
  if (typeof window === 'undefined' || !descriptor || descriptor.length !== 64) return;
  localStorage.setItem(LAST_ENROLLED_DESC_KEY, JSON.stringify(descriptor));
}

export function getLastVerifiedFaceDescriptor(): number[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_ENROLLED_DESC_KEY);
    if (!raw) {
      const tpl = getEnrolledBiometricTemplate();
      return tpl?.descriptor ?? null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length === 64 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Upserts a wallet vault into the persistent Biometric Enclave Registry, binding it
 * to the user's OpenBR Face Descriptor and/or Hardware Fingerprint Passkey ID.
 */
export async function bindWalletToBiometrics(params: {
  walletAddress: string;
  publicKeyHex: string;
  encryptedJwk: string;
  iv: string;
  mode?: 'webauthn' | 'pin';
  faceDescriptor?: number[] | null;
  hardwareCredentialId?: string | null;
}): Promise<BiometricVaultEntry> {
  const registry = loadVaultRegistry();
  const now = new Date().toISOString();

  const desc =
    params.faceDescriptor !== undefined
      ? params.faceDescriptor
      : getLastVerifiedFaceDescriptor();
  const tplHash = desc ? await computeTemplateHash(desc) : null;
  const hwId =
    params.hardwareCredentialId ??
    (typeof window !== 'undefined'
      ? localStorage.getItem('invisible_wallet_hw_biometric_cred_id')
      : null);

  const existingIdx = registry.findIndex(
    (e) => e.walletAddress.toLowerCase() === params.walletAddress.toLowerCase(),
  );

  const entry: BiometricVaultEntry = {
    walletAddress: params.walletAddress,
    publicKeyHex: params.publicKeyHex,
    encryptedJwk: params.encryptedJwk,
    iv: params.iv,
    mode: params.mode || 'webauthn',
    faceDescriptor: desc ?? (existingIdx >= 0 ? registry[existingIdx].faceDescriptor : null),
    faceTemplateHash:
      tplHash ?? (existingIdx >= 0 ? registry[existingIdx].faceTemplateHash : null),
    hardwareCredentialId:
      hwId ?? (existingIdx >= 0 ? registry[existingIdx].hardwareCredentialId : null),
    createdAt: existingIdx >= 0 ? registry[existingIdx].createdAt : now,
    lastAccessedAt: now,
  };

  if (existingIdx >= 0) {
    registry[existingIdx] = entry;
  } else {
    registry.unshift(entry);
  }

  saveVaultRegistry(registry);

  // Also ensure the active OpenBR template matches this wallet's bound face
  if (entry.faceDescriptor && entry.faceTemplateHash && typeof window !== 'undefined') {
    const activeTpl: OpenBRTemplate = {
      version: 1,
      walletAddress: entry.walletAddress,
      descriptor: entry.faceDescriptor,
      templateHash: entry.faceTemplateHash,
      enrolledAt: entry.lastAccessedAt,
      sampleCount: 16,
    };
    localStorage.setItem('invisible_wallet_openbr_template', JSON.stringify(activeTpl));
  }

  return entry;
}

/**
 * Restores a matched BiometricVaultEntry into the active session keys in localStorage.
 */
export function activateBiometricVaultSession(entry: BiometricVaultEntry): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('invisible_wallet_address', entry.walletAddress);
  localStorage.setItem('invisible_wallet_public_key', entry.publicKeyHex);
  localStorage.setItem('invisible_wallet_encrypted_key', entry.encryptedJwk);
  localStorage.setItem('invisible_wallet_key_iv', entry.iv);
  localStorage.setItem('invisible_wallet_mode', entry.mode);
  if (entry.hardwareCredentialId) {
    localStorage.setItem(
      'invisible_wallet_hw_biometric_cred_id',
      entry.hardwareCredentialId,
    );
  }
  if (entry.faceDescriptor && entry.faceTemplateHash) {
    const activeTpl: OpenBRTemplate = {
      version: 1,
      walletAddress: entry.walletAddress,
      descriptor: entry.faceDescriptor,
      templateHash: entry.faceTemplateHash,
      enrolledAt: entry.lastAccessedAt,
      sampleCount: 16,
    };
    localStorage.setItem('invisible_wallet_openbr_template', JSON.stringify(activeTpl));
  }
}

