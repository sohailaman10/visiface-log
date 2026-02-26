/**
 * FaceScanner Component
 * Real-time face detection with bounding box overlay.
 * Uses face-api.js for client-side detection and 128D embedding extraction.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { loadFaceModels, detectFace, drawFaceOverlay, FaceDetectionResult } from '@/lib/faceDetection';

interface FaceScannerProps {
  onEmbeddingCaptured: (embedding: number[]) => void;
  autoCapture?: boolean;   // Auto-capture when face is good
  enabled?: boolean;       // Enable/disable scanning
  captureDelay?: number;   // Delay between auto-captures (ms)
}

type ScanStatus = 'loading' | 'scanning' | 'detected' | 'capturing' | 'no-face' | 'multiple' | 'not-centered';

const STATUS_LABELS: Record<ScanStatus, string> = {
  loading: '⏳ Loading face detection models...',
  scanning: '🔍 Scanning for face...',
  detected: '✅ Face detected — hold still...',
  capturing: '📸 Capturing embedding...',
  'no-face': '❌ No face detected',
  multiple: '⚠️ Multiple faces detected — only one allowed',
  'not-centered': '↔️ Please center your face',
};

export default function FaceScanner({
  onEmbeddingCaptured,
  autoCapture = true,
  enabled = true,
  captureDelay = 1500,
}: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastCaptureRef = useRef<number>(0);

  const [status, setStatus] = useState<ScanStatus>('loading');
  const [modelsReady, setModelsReady] = useState(false);

  // Load models on mount
  useEffect(() => {
    let cancelled = false;
    loadFaceModels().then(() => {
      if (!cancelled) setModelsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Start/stop webcam
  useEffect(() => {
    if (!enabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [enabled]);

  // Face detection loop
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsReady || !enabled) return;

    const result: FaceDetectionResult = await detectFace(videoRef.current);

    // Determine status
    let currentStatus: ScanStatus = 'scanning';
    if (result.count === 0) currentStatus = 'no-face';
    else if (result.count > 1) currentStatus = 'multiple';
    else if (!result.centered) currentStatus = 'not-centered';
    else if (result.detected && result.confidence > 0.6) currentStatus = 'detected';

    setStatus(currentStatus);

    // Draw overlay
    drawFaceOverlay(canvasRef.current, videoRef.current, result, STATUS_LABELS[currentStatus]);

    // Auto-capture embedding if conditions met
    if (
      autoCapture &&
      currentStatus === 'detected' &&
      result.embedding &&
      Date.now() - lastCaptureRef.current > captureDelay
    ) {
      lastCaptureRef.current = Date.now();
      setStatus('capturing');
      onEmbeddingCaptured(result.embedding);
    }
  }, [modelsReady, enabled, autoCapture, captureDelay, onEmbeddingCaptured]);

  // Start detection interval
  useEffect(() => {
    if (!modelsReady || !enabled) return;

    setStatus('scanning');
    intervalRef.current = window.setInterval(runDetection, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [modelsReady, enabled, runDetection]);

  return (
    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center space-y-2">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Loading face detection models...</p>
          </div>
        </div>
      )}
    </div>
  );
}
