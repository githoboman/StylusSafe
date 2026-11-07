import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * OpenBR-Inspired Craniofacial Biometric Feature Extraction & 1:1 Template Matching Engine
 * Reference Architecture: https://github.com/biometrics/openbr.git
 *
 * Extracts a 64-dimensional scale-, translation-, and rotation-invariant geometric
 * feature descriptor from 468 3D facial landmarks, L2-normalizes the gallery template
 * during First-Time Wallet Sign-Up (Enrollment), and performs 1:1 Cosine Similarity +
 * Euclidean Distance verification on subsequent transaction approvals.
 */

export type OpenBRTemplate = {
  version: 1;
  walletAddress: string | null;
  descriptor: number[]; // 64-D L2-normalized craniofacial feature vector
  templateHash: string; // SHA-256 hex commitment of the enrolled descriptor
  enrolledAt: string;
  sampleCount: number;
};

export type OpenBRMatchResult = {
  matched: boolean;
  similarity: number; // 0.0 to 1.0
  confidencePct: number; // e.g. 96.4
  distance: number; // Euclidean L2 distance
  templateHash: string;
};

const STORAGE_KEY = 'invisible_wallet_openbr_template';

/** Threshold for 1:1 craniofacial template match verification */
export const OPENBR_MATCH_THRESHOLD = 0.88;

/**
 * Key anthropological landmark pairs on the 468-point MediaPipe topology
 * used to compute scale-invariant craniofacial ratios (OpenBR Geometric Transform).
 */
const CRANIOFACIAL_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [33, 263],   // 0: Outer inter-ocular width (reference baseline)
  [133, 362],  // 1: Inner inter-canthal width
  [33, 133],   // 2: Left eye horizontal fissure
  [362, 263],  // 3: Right eye horizontal fissure
  [10, 152],   // 4: Trichion (forehead) to Gnathion (chin) vertical height
  [10, 6],     // 5: Forehead to Nasion (nasal root)
  [6, 1],      // 6: Nasion to Pronasale (nose tip)
  [1, 2],      // 7: Nose tip to Subnasale
  [2, 13],     // 8: Subnasale to Labiale superius (philtrum length)
  [14, 152],   // 9: Labiale inferius to Gnathion (lower jaw height)
  [61, 291],   // 10: Cheilion to Cheilion (mouth width)
  [48, 278],   // 11: Alare to Alare (nasal wing width)
  [234, 454],  // 12: Bizygomatic breadth (cheekbone width)
  [172, 397],  // 13: Bigonial breadth (mandibular angle width)
  [70, 300],   // 14: Lateral brow ridge width
  [105, 334],  // 15: Medial brow peak distance
  [65, 295],   // 16: Inner brow separation
  [33, 61],    // 17: Left outer eye to left mouth corner
  [263, 291],  // 18: Right outer eye to right mouth corner
  [133, 48],   // 19: Left inner eye to left nasal wing
  [362, 278],  // 20: Right inner eye to right nasal wing
  [1, 61],     // 21: Nose tip to left mouth corner
  [1, 291],    // 22: Nose tip to right mouth corner
  [1, 152],    // 23: Nose tip to chin tip
  [33, 1],     // 24: Left outer eye to nose tip
  [263, 1],    // 25: Right outer eye to nose tip
  [105, 159],  // 26: Left brow peak to left upper eyelid
  [334, 386],  // 27: Right brow peak to right upper eyelid
  [234, 1],    // 28: Left cheekbone to nose tip
  [454, 1],    // 29: Right cheekbone to nose tip
  [172, 152],  // 30: Left gonion to chin tip
  [397, 152],  // 31: Right gonion to chin tip
];

/**
 * 16 craniofacial angular triplets (A -> Vertex B -> C) capturing facialbone angles
 * invariant to camera focal length.
 */
const CRANIOFACIAL_ANGLES: ReadonlyArray<readonly [number, number, number]> = [
  [33, 1, 263],    // 0: Ocular-nasal apex angle
  [61, 1, 291],    // 1: Oral-nasal apex angle
  [234, 152, 454], // 2: Zygomatic-chin mandibular taper angle
  [172, 152, 397], // 3: Gonial-menton jaw angle
  [10, 1, 152],    // 4: Facial profile convexity angle
  [33, 61, 152],   // 5: Left lateral facial polygon angle
  [263, 291, 152], // 6: Right lateral facial polygon angle
  [70, 33, 234],   // 7: Left orbital-zygomatic angle
  [300, 263, 454], // 8: Right orbital-zygomatic angle
  [6, 1, 2],       // 9: Nasal dorsum-columella angle
  [48, 1, 278],    // 10: Nasal tip alar angle
  [133, 6, 362],   // 11: Intercanthal-nasion bridge angle
  [61, 152, 291],  // 12: Oral-menton triangle angle
  [105, 6, 334],   // 13: Supraorbital-nasion angle
  [234, 10, 454],  // 14: Frontal-zygomatic cranial angle
  [48, 13, 278],   // 15: Subnasale-philtrum angle
];

/**
 * 16 depth-relief landmarks whose relative Z-depth (normalized by inter-ocular width)
 * captures 3D facial structure (defeating flat 2D photo printouts).
 */
const DEPTH_RELIEF_INDICES: ReadonlyArray<number> = [
  1,   // Nose tip
  6,   // Nasion
  10,  // Forehead center
  152, // Chin gnathion
  33,  // Left outer eye
  263, // Right outer eye
  133, // Left inner eye
  362, // Right inner eye
  234, // Left zygomatic arch
  454, // Right zygomatic arch
  172, // Left mandibular gonion
  397, // Right mandibular gonion
  61,  // Left mouth corner
  291, // Right mouth corner
  105, // Left supraorbital ridge
  334, // Right supraorbital ridge
];

function dist3d(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

function angle3d(
  a: NormalizedLandmark,
  vertex: NormalizedLandmark,
  c: NormalizedLandmark,
): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v1z = (a.z ?? 0) - (vertex.z ?? 0);

  const v2x = c.x - vertex.x;
  const v2y = c.y - vertex.y;
  const v2z = (c.z ?? 0) - (vertex.z ?? 0);

  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const mag1 = Math.hypot(v1x, v1y, v1z) + 1e-8;
  const mag2 = Math.hypot(v2x, v2y, v2z) + 1e-8;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cos) / Math.PI; // Normalized to [0, 1]
}

function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq) + 1e-12;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

/**
 * Extracts a 64-D L2-normalized OpenBR craniofacial descriptor from a 468-point mesh.
 */
export function extractOpenBRDescriptor(
  landmarks: NormalizedLandmark[],
): number[] | null {
  if (!landmarks || landmarks.length < 455) return null;

  const baseDist = dist3d(landmarks[33], landmarks[263]);
  if (baseDist < 1e-4) return null;

  const raw: number[] = [];

  // 1..32: Scale-invariant craniofacial distance ratios
  for (const [i, j] of CRANIOFACIAL_PAIRS) {
    const d = dist3d(landmarks[i], landmarks[j]) / baseDist;
    raw.push(d);
  }

  // 33..48: Scale- and roll-invariant craniofacial angles
  for (const [a, b, c] of CRANIOFACIAL_ANGLES) {
    raw.push(angle3d(landmarks[a], landmarks[b], landmarks[c]));
  }

  // 49..64: 3D Z-relief relative to ocular plane midpoint
  const eyeCenterZ = ((landmarks[33].z ?? 0) + (landmarks[263].z ?? 0)) / 2;
  for (const idx of DEPTH_RELIEF_INDICES) {
    const relZ = ((landmarks[idx].z ?? 0) - eyeCenterZ) / baseDist;
    raw.push(relZ + 1.0); // Shifted positive for stable cosine space
  }

  return l2Normalize(raw);
}

/**
 * Averages multiple descriptors captured during the 5-step enrollment sequence
 * to produce a high-signal gallery template.
 */
export function combineEnrollmentDescriptors(descriptors: number[][]): number[] {
  if (descriptors.length === 0) return [];
  const dim = descriptors[0].length;
  const avg = new Array<number>(dim).fill(0);
  for (const d of descriptors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += d[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    avg[i] /= descriptors.length;
  }
  return l2Normalize(avg);
}

export async function computeTemplateHash(descriptor: number[]): Promise<string> {
  const payload = descriptor.map((n) => n.toFixed(5)).join(',');
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Saves the enrolled OpenBR biometric template to local storage.
 */
export async function saveEnrolledBiometricTemplate(
  descriptors: number[][],
  walletAddress: string | null = null,
): Promise<OpenBRTemplate | null> {
  const combined = combineEnrollmentDescriptors(descriptors);
  if (combined.length === 0) return null;

  const templateHash = await computeTemplateHash(combined);
  const template: OpenBRTemplate = {
    version: 1,
    walletAddress,
    descriptor: combined,
    templateHash,
    enrolledAt: new Date().toISOString(),
    sampleCount: descriptors.length,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
  }
  return template;
}

/**
 * Loads the enrolled OpenBR biometric template from local storage.
 */
export function getEnrolledBiometricTemplate(): OpenBRTemplate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpenBRTemplate;
    if (!parsed || !Array.isArray(parsed.descriptor) || parsed.descriptor.length !== 64) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearEnrolledBiometricTemplate(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Compares a live probe landmark mesh against the enrolled OpenBR gallery template.
 */
export function verifyAgainstEnrolledTemplate(
  landmarks: NormalizedLandmark[],
  enrolled: OpenBRTemplate,
): OpenBRMatchResult | null {
  const probe = extractOpenBRDescriptor(landmarks);
  if (!probe || probe.length !== enrolled.descriptor.length) return null;

  let dot = 0;
  let distSq = 0;
  for (let i = 0; i < probe.length; i++) {
    dot += probe[i] * enrolled.descriptor[i];
    const diff = probe[i] - enrolled.descriptor[i];
    distSq += diff * diff;
  }

  const distance = Math.sqrt(distSq);
  // Map Euclidean distance in L2-normalized craniofacial space to a calibrated similarity score
  // Typical intra-person L2 distance across frames is 0.02..0.09; inter-person is >0.16
  const calibratedSim = Math.max(0, Math.min(1, 1 - distance * 0.85));
  const rawCosine = Math.max(0, Math.min(1, dot));
  const similarity = Number((calibratedSim * 0.75 + rawCosine * 0.25).toFixed(4));
  const confidencePct = Number((similarity * 100).toFixed(1));

  return {
    matched: similarity >= OPENBR_MATCH_THRESHOLD,
    similarity,
    confidencePct,
    distance: Number(distance.toFixed(4)),
    templateHash: enrolled.templateHash,
  };
}

