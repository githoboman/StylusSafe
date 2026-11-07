import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';

export type FaceLandmarkerHandle = Awaited<
  ReturnType<(typeof FaceLandmarker)['createFromOptions']>
>;

let landmarkerPromise: Promise<FaceLandmarkerHandle> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarkerHandle> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const wasm = await FilesetResolver.forVisionTasks(WASM_CDN);
      return FaceLandmarker.createFromOptions(wasm, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    })();
  }
  return landmarkerPromise;
}

export function detectFace(
  landmarker: FaceLandmarkerHandle,
  video: HTMLVideoElement,
  timestampMs: number,
): NormalizedLandmark[] | null {
  if (video.readyState < 2) return null;
  const result = landmarker.detectForVideo(video, timestampMs);
  const first = result.faceLandmarks[0];
  return first ?? null;
}

export function resetFaceLandmarkerCache(): void {
  landmarkerPromise = null;
}

