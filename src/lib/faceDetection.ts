/**
 * Face Detection Utility
 * Uses face-api.js for client-side face detection and 128D embedding extraction.
 * No external AI API calls required.
 */
import * as faceapi from 'face-api.js';

let modelsLoaded = false;

// Load face-api.js models from public/models/
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_URL = '/models';

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
  console.log('Face-api.js models loaded successfully');
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

// Detection options for TinyFaceDetector
const DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
});

export interface FaceDetectionResult {
  detected: boolean;
  count: number;
  confidence: number;
  centered: boolean;
  embedding: number[] | null;
  box: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Detect faces in a video element and extract 128D embedding.
 * Returns detection info including bounding box and embedding vector.
 */
export async function detectFace(
  video: HTMLVideoElement
): Promise<FaceDetectionResult> {
  const result: FaceDetectionResult = {
    detected: false,
    count: 0,
    confidence: 0,
    centered: false,
    embedding: null,
    box: null,
  };

  if (!modelsLoaded || !video || video.readyState < 2) return result;

  // Detect all faces with landmarks and descriptors
  const detections = await faceapi
    .detectAllFaces(video, DETECTION_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptors();

  result.count = detections.length;

  if (detections.length !== 1) return result; // Must be exactly one face

  const detection = detections[0];
  result.detected = true;
  result.confidence = detection.detection.score;

  // Get bounding box
  const { x, y, width, height } = detection.detection.box;
  result.box = { x, y, width, height };

  // Check if face is roughly centered (within middle 60% of frame)
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const faceCenterX = x + width / 2;
  const faceCenterY = y + height / 2;
  const marginX = videoWidth * 0.2;
  const marginY = videoHeight * 0.2;

  result.centered =
    faceCenterX > marginX &&
    faceCenterX < videoWidth - marginX &&
    faceCenterY > marginY &&
    faceCenterY < videoHeight - marginY;

  // Extract 128D face descriptor (embedding)
  if (result.confidence > 0.6 && result.centered) {
    result.embedding = Array.from(detection.descriptor); // Float32Array -> number[]
  }

  return result;
}

/**
 * Draw face bounding box and status on canvas overlay.
 */
export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  result: FaceDetectionResult,
  status: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (result.box) {
    const { x, y, width, height } = result.box;

    // Draw bounding box
    ctx.strokeStyle = result.centered && result.confidence > 0.6 ? '#22c55e' : '#eab308';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Draw corner accents
    const cornerLen = 20;
    ctx.lineWidth = 4;
    ctx.strokeStyle = result.centered ? '#22c55e' : '#eab308';

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + width - cornerLen, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + cornerLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + height - cornerLen);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + cornerLen, y + height);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + width - cornerLen, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - cornerLen);
    ctx.stroke();

    // Confidence label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y - 28, width, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${Math.round(result.confidence * 100)}% confidence`, x + 6, y - 10);
  }

  // Status text at bottom
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(status, canvas.width / 2, canvas.height - 14);
  ctx.textAlign = 'start';
}
