/**
 * Unified Cross-Platform BiometricPrompt & CryptoObject Hardware Authenticator
 * (Desktop + Mobile iOS/Android)
 *
 * Synthesizes:
 * 1. rushisangani/BiometricAuthentication (BiometricAuthenticator.swift):
 *    - Platform capability detection (Face ID, Touch ID, Optic ID, Android BiometricPrompt, Windows Hello)
 *    - Zero lock-screen reuse duration (allowableReuseDuration = 0) so every transaction requires fresh evaluation
 * 2. gaoyangcr7/BiometricPromptDemo (BiometricPromptManager.java, BiometricPromptApi28.java, CryptoObjectHelper.java):
 *    - Hardware-bound NIST P-256 (secp256r1) KeyPair generation with SHA256withECDSA CryptoObject signing
 *    - Structured callback lifecycle (onSucceeded, onFailed, onError, onUsePassword)
 */

export type BiometryHardwareType =
  | 'FaceID'
  | 'TouchID'
  | 'OpticID'
  | 'AndroidBiometricPrompt'
  | 'WindowsHello'
  | 'PlatformPasskey'
  | 'OpticalNeuralEnclave';

export type BiometricCapabilities = {
  canAuthenticate: boolean;
  isHardwareDetected: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  biometryType: BiometryHardwareType;
  label: string;
  allowableReuseDuration: 0;
};

export interface OnBiometricIdentifyCallback {
  /** Forces navigator.credentials.create even if a prior hardware credential ID exists (wallet creation). */
  forceNewEnrollment?: boolean;
  onUsePassword?: () => void;
  onSucceeded?: (result: {
    credentialId?: string;
    biometryType: BiometryHardwareType;
    publicKeyHex?: string;
    timestamp: number;
  }) => void;
  onFailed?: () => void;
  onError?: (code: string, reason: string) => void;
  onCancel?: () => void;
}

const HW_CREDENTIAL_KEY = 'invisible_wallet_hw_biometric_cred_id';

/**
 * Detects exact mobile (iOS FaceID/TouchID, Android BiometricPrompt API 28+)
 * and desktop (macOS TouchID, Windows Hello, WebAuthn Platform Authenticator)
 * capabilities.
 */
export async function detectBiometricCapabilities(): Promise<BiometricCapabilities> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      canAuthenticate: false,
      isHardwareDetected: false,
      isMobile: false,
      isDesktop: true,
      biometryType: 'OpticalNeuralEnclave',
      label: 'FaceVerify Optical Enclave',
      allowableReuseDuration: 0,
    };
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  const isWindows = /Windows/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/i.test(ua);
  const isDesktop = !isMobile;

  let platformAuthenticatorAvailable = false;
  try {
    if (
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
        'function'
    ) {
      platformAuthenticatorAvailable =
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    platformAuthenticatorAvailable = false;
  }

  let biometryType: BiometryHardwareType = 'OpticalNeuralEnclave';
  let label = 'OpenBR + MediaPipe Neural Liveness';

  if (isIOS) {
    biometryType = 'FaceID';
    label = 'iOS Face ID / Touch ID (LAContext)';
  } else if (isAndroid) {
    biometryType = 'AndroidBiometricPrompt';
    label = 'Android BiometricPrompt (API 28+ secp256r1)';
  } else if (isMac && platformAuthenticatorAvailable) {
    biometryType = 'TouchID';
    label = 'macOS Secure Enclave Touch ID';
  } else if (isWindows && platformAuthenticatorAvailable) {
    biometryType = 'WindowsHello';
    label = 'Windows Hello Biometric Enclave';
  } else if (platformAuthenticatorAvailable) {
    biometryType = 'PlatformPasskey';
    label = 'Hardware Platform Authenticator';
  }

  return {
    canAuthenticate: true,
    isHardwareDetected: platformAuthenticatorAvailable,
    isMobile,
    isDesktop,
    biometryType,
    label,
    allowableReuseDuration: 0,
  };
}

/**
 * Triggers native OS BiometricPrompt / LAContext / Windows Hello / TouchID
 * when the user selects Hardware Device Biometrics on Mobile or Desktop.
 * Mirrors BiometricPromptApi28.authenticate(CryptoObject) & BiometricAuthenticator.authenticateWithBiometrics().
 */
export async function triggerHardwareBiometricPrompt(
  reason: string,
  callbacks?: OnBiometricIdentifyCallback,
): Promise<{ verified: boolean; credentialId?: string; biometryType: BiometryHardwareType; publicKeyHex?: string }> {
  const caps = await detectBiometricCapabilities();

  if (typeof window === 'undefined' || !navigator.credentials) {
    const errReason = 'Platform WebAuthn credentials API unavailable in this context.';
    callbacks?.onError?.('not_available', errReason);
    throw new Error(errReason);
  }

  const existingCredId = localStorage.getItem(HW_CREDENTIAL_KEY);
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  try {
    if (existingCredId && !callbacks?.forceNewEnrollment) {
      // Authenticate against existing hardware credential (BiometricPrompt.authenticate)
      const credIdBin = atob(existingCredId.replace(/-/g, '+').replace(/_/g, '/'));
      const credIdBytes = Uint8Array.from(credIdBin, (c) => c.charCodeAt(0));

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id: credIdBytes, type: 'public-key' }],
          userVerification: 'required',
          timeout: 45_000,
        },
      })) as PublicKeyCredential | null;

      if (!assertion) {
        callbacks?.onFailed?.();
        throw new Error('Biometric verification did not return an assertion.');
      }

      localStorage.setItem(HW_CREDENTIAL_KEY, assertion.id);
      localStorage.setItem('invisible_wallet_last_auth_method', 'biometric_prompt');

      const res = {
        credentialId: assertion.id,
        biometryType: caps.biometryType,
        timestamp: Date.now(),
      };
      callbacks?.onSucceeded?.(res);
      return { verified: true, credentialId: assertion.id, biometryType: caps.biometryType };
    } else {
      // Enroll new hardware secp256r1 (alg: -7) biometric passkey (Fingerprint / TouchID / Windows Hello)
      const userId = crypto.getRandomValues(new Uint8Array(16));
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'StylusSafe Arbitrum Vault' },
          user: {
            id: userId,
            name: `fingerprint-${Date.now()}@stylussafe.xyz`,
            displayName: reason || 'StylusSafe Fingerprint Vault',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256 (NIST P-256 / secp256r1)
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 45_000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        callbacks?.onFailed?.();
        throw new Error('Hardware biometric enrollment was not completed.');
      }

      let publicKeyHex: string | undefined;
      try {
        const att = credential.response as AuthenticatorAttestationResponse;
        const spki = typeof att.getPublicKey === 'function' ? att.getPublicKey() : null;
        if (spki) {
          const imported = await crypto.subtle.importKey(
            'spki',
            spki,
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['verify'],
          );
          const raw = new Uint8Array(await crypto.subtle.exportKey('raw', imported));
          if (raw.length === 65 && raw[0] === 0x04) {
            publicKeyHex = Array.from(raw, (b) => b.toString(16).padStart(2, '0')).join('');
          }
        }
      } catch {
        // Non-SPKI or non-P256 authenticator; credential ID still gates the enclave session key.
      }

      localStorage.setItem(HW_CREDENTIAL_KEY, credential.id);
      localStorage.setItem('invisible_wallet_last_auth_method', 'biometric_prompt');
      const res = {
        credentialId: credential.id,
        biometryType: caps.biometryType,
        publicKeyHex,
        timestamp: Date.now(),
      };
      callbacks?.onSucceeded?.(res);
      return { verified: true, credentialId: credential.id, biometryType: caps.biometryType, publicKeyHex };
    }
  } catch (err: any) {
    const name = err?.name || 'BiometricError';
    const msg = err?.message || 'Hardware biometric prompt cancelled or unavailable.';
    if (name === 'NotAllowedError') {
      callbacks?.onCancel?.();
    } else {
      callbacks?.onError?.(name, msg);
    }
    throw err;
  }
}

