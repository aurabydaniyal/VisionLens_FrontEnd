/**
 * Client-side selective smart frame gate:
 * 1. Laplacian variance sharpness score (rejects motion-blurred frames locally)
 * 2. 8x8 perceptual dHash scene-change gate (skips unchanged static frames -> 0 quota/API cost)
 * 3. Clean 1024px max-dimension JPEG encoding purely in browser memory
 */

export interface FrameGateResult {
  passed: boolean;
  reason?: 'blurry' | 'unchanged';
  sharpness: number;
  dhash: string;
  hammingDistance: number;
  blob?: Blob;
}

const MAX_UPLOAD_DIM = 1024;
const BLUR_THRESHOLD = 28;
const DHASH_CHANGE_THRESHOLD = 6;

function computeGrayscale(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

/** Compute Laplacian variance on a small analysis canvas to reject motion blur. */
function computeLaplacianVariance(gray: Float32Array, width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      const lap =
        gray[idx - width] +
        gray[idx + width] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/** Compute 64-bit difference hash (9x8 grayscale -> 64 bits) for fast scene-change detection. */
function computeDHash(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): string {
  const c = document.createElement('canvas');
  c.width = 9;
  c.height = 8;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';
  ctx.drawImage(source, 0, 0, 9, 8);
  const gray = computeGrayscale(ctx.getImageData(0, 0, 9, 8));

  let bits = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits += gray[y * 9 + x] > gray[y * 9 + x + 1] ? '1' : '0';
    }
  }
  return bits;
}

export function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff;
}

/** Resize source cleanly to <= 1024px max dimension and return JPEG Blob in RAM. */
export async function captureResizedBlob(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  quality = 0.86
): Promise<Blob> {
  const srcW =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLImageElement
        ? source.naturalWidth
        : source.width;
  const srcH =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLImageElement
        ? source.naturalHeight
        : source.height;

  const scale = Math.min(1, MAX_UPLOAD_DIM / Math.max(srcW || 1, srcH || 1));
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.drawImage(source, 0, 0, outW, outH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode frame JPEG'));
      },
      'image/jpeg',
      quality
    );
  });
}

/** Evaluate video frame against Laplacian blur & dHash change gate before sending to backend. */
export async function evaluateVideoFrame(
  video: HTMLVideoElement,
  lastHash: string,
  forceBypass = false
): Promise<FrameGateResult> {
  const dhash = computeDHash(video);
  const dist = hammingDistance(lastHash, dhash);

  // Small 160px analysis pass for fast <3ms Laplacian sharpness
  const probe = document.createElement('canvas');
  probe.width = 160;
  probe.height = 120;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  let sharpness = 100;
  if (pctx) {
    pctx.drawImage(video, 0, 0, 160, 120);
    const gray = computeGrayscale(pctx.getImageData(0, 0, 160, 120));
    sharpness = computeLaplacianVariance(gray, 160, 120);
  }

  if (!forceBypass && sharpness < BLUR_THRESHOLD) {
    return {
      passed: false,
      reason: 'blurry',
      sharpness,
      dhash,
      hammingDistance: dist,
    };
  }

  if (!forceBypass && lastHash && dist < DHASH_CHANGE_THRESHOLD) {
    return {
      passed: false,
      reason: 'unchanged',
      sharpness,
      dhash,
      hammingDistance: dist,
    };
  }

  const blob = await captureResizedBlob(video);
  return {
    passed: true,
    sharpness,
    dhash,
    hammingDistance: dist,
    blob,
  };
}
