import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export const L = {
  noseTip: 1,
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  upperLip: 13,
  lowerLip: 14,
  leftEyeEar: [33, 160, 158, 133, 153, 144] as const,
  rightEyeEar: [362, 385, 387, 263, 373, 380] as const,
} as const;

export type HeadTurn = 'LEFT' | 'RIGHT' | 'CENTER';

export type KeyLandmarks = {
  noseTip: NormalizedLandmark;
  leftEye: NormalizedLandmark;
  rightEye: NormalizedLandmark;
  upperLip: NormalizedLandmark;
  lowerLip: NormalizedLandmark;
};

export function extractKeyLandmarks(
  landmarks: NormalizedLandmark[],
): KeyLandmarks {
  return {
    noseTip: landmarks[L.noseTip],
    leftEye: landmarks[L.leftEyeOuter],
    rightEye: landmarks[L.rightEyeOuter],
    upperLip: landmarks[L.upperLip],
    lowerLip: landmarks[L.lowerLip],
  };
}

function dist2d(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function earForEye(
  landmarks: NormalizedLandmark[],
  indices: readonly [number, number, number, number, number, number],
): number {
  const [i1, i2, i3, i4, i5, i6] = indices;
  const p1 = landmarks[i1];
  const p2 = landmarks[i2];
  const p3 = landmarks[i3];
  const p4 = landmarks[i4];
  const p5 = landmarks[i5];
  const p6 = landmarks[i6];
  const v1 = dist2d(p2, p6);
  const v2 = dist2d(p3, p5);
  const h = dist2d(p1, p4);
  return (v1 + v2) / (2 * h + 1e-6);
}

export function eyeAspectRatio(landmarks: NormalizedLandmark[]): number {
  const left = earForEye(landmarks, L.leftEyeEar);
  const right = earForEye(landmarks, L.rightEyeEar);
  return (left + right) / 2;
}

export function interEyeDistance(landmarks: NormalizedLandmark[]): number {
  return dist2d(landmarks[L.leftEyeOuter], landmarks[L.rightEyeOuter]);
}

export function detectHeadTurn(landmarks: NormalizedLandmark[]): HeadTurn {
  const nose = landmarks[L.noseTip];
  const leftEye = landmarks[L.leftEyeOuter];
  const rightEye = landmarks[L.rightEyeOuter];
  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeWidth = Math.abs(rightEye.x - leftEye.x) + 1e-6;
  const offset = (nose.x - eyeMidX) / eyeWidth;
  // Wider "center" band — phone selfie cams / arm's-length hold often read slightly off-axis.
  const t = 0.15;
  // Labels match egocentric "your left/right" vs the mirrored preview (CSS flip).
  if (offset < -t) return 'RIGHT';
  if (offset > t) return 'LEFT';
  return 'CENTER';
}

export function detectMouthOpen(landmarks: NormalizedLandmark[]): boolean {
  const mouth = dist2d(landmarks[L.upperLip], landmarks[L.lowerLip]);
  const eyeW = interEyeDistance(landmarks);
  const ratio = mouth / (eyeW + 1e-6);
  // Slightly higher bar so resting lips on mobile don't read as "open".
  return ratio > 0.26;
}

// Mobile front cameras often yield lower EAR; keep a gap so blink still has open vs closed.
const EAR_OPEN = 0.16;
const EAR_CLOSED = 0.12;

export function detectBlink(landmarks: NormalizedLandmark[]): boolean {
  const ear = eyeAspectRatio(landmarks);
  return ear < EAR_CLOSED;
}

export function eyesLikelyOpen(landmarks: NormalizedLandmark[]): boolean {
  return eyeAspectRatio(landmarks) > EAR_OPEN;
}

export function faceBoundingBox(landmarks: NormalizedLandmark[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of landmarks) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 0.02;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(1, maxX + pad);
  maxY = Math.min(1, maxY + pad);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function averageFrameLuminance(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): number | null {
  if (video.readyState < 2) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const w = 48;
  const h = 36;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  const n = w * h;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / n;
}

