'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface CardUploaderProps {
  onPlayerAdded: (player: any) => boolean | void | Promise<boolean | void>;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  userId: string;
}

export default function CardUploader({ onPlayerAdded, onError, onSuccess, userId }: CardUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Attach stream to video element after React renders it
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    setVideoReady(false);
    const onReady = () => { setVideoReady(true); video.play().catch(() => {}); };
    video.addEventListener('loadeddata', onReady);
    if (video.readyState >= 2) onReady();
    return () => video.removeEventListener('loadeddata', onReady);
  }, [stream, cameraActive]);

  const startCamera = async () => {
    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, facingMode: { ideal: 'environment' } },
        });
      } catch {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      setStream(mediaStream);
      setCameraActive(true);
    } catch {
      onError?.('Could not access camera. Please check permissions and try again.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setVideoReady(false);
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) { onError?.('Camera not ready. Please try again.'); return; }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { onError?.('Could not access camera canvas.'); return; }
    if (video.videoWidth === 0 || video.videoHeight === 0) { onError?.('Camera not ready. Wait a moment and try again.'); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        await analyzeCard(file);
        stopCamera();
      } else {
        onError?.('Could not capture photo. Please try again.');
      }
    }, 'image/jpeg', 0.9);
  };

  const analyzeCard = async (file: File) => {
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/analyze-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, userId }),
      });
      if (!response.ok) throw new Error('Failed to analyze card');
      const result = await response.json();

      if (result.error) {
        let msg = result.error;
        if (result.error.includes('basketball')) msg = '🏀 That looks like a basketball card! Please scan a soccer card.';
        else if (result.error.includes('baseball')) msg = '⚾ That appears to be a baseball card! Please scan a soccer card.';
        else if (result.error.includes('American football') || result.error.includes('NFL')) msg = '🏈 That looks like an American football card! Please scan a soccer card.';
        else if (result.error.includes('Cannot read') || result.error.includes('not clear')) msg = '📸 Card image is unclear. Try better lighting.';
        else if (result.error.includes('not a') && result.error.includes('card')) msg = '🃏 Please scan a clear soccer/football player card.';
        onError?.(msg);
        return;
      }

      if (!result.name || !result.position || typeof result.rating !== 'number') {
        onError?.('Card analyzed but missing data. Try a different card.');
        return;
      }

      const accepted = await onPlayerAdded(result);
      if (accepted !== false) {
        onSuccess?.(`⚽ ${result.name} added! (${result.position} · ${result.rating})`);
      }
    } catch {
      onError?.('Failed to analyze card. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  if (uploading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-fifa-mint mb-3" />
        <p className="font-retro text-[9px] text-fifa-mint/70 animate-pulse">Analyzing card…</p>
      </div>
    );
  }

  if (!cameraActive) {
    return (
      <div className="text-center py-6">
        <div className="mb-4 flex justify-center">
          <Image src="/camera.png" alt="Camera" width={80} height={80} style={{ imageRendering: 'pixelated' }} unoptimized />
        </div>
        <p className="font-headline text-[11px] text-fifa-cream/70 mb-1">Scan a player card with your camera</p>
        <p className="font-headline text-[10px] text-white/30 mb-5">Point camera at a soccer player card</p>
        <button
          onClick={startCamera}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          <Image src="/camera.png" alt="" width={16} height={16} style={{ imageRendering: 'pixelated' }} unoptimized />
          Open Camera
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative bg-fifa-dark rounded-xl overflow-hidden border border-fifa-border" style={{ minHeight: '260px' }}>
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="w-full h-auto max-h-80 object-cover"
          style={{ minHeight: '260px' }}
        />
        <canvas ref={canvasRef} className="hidden" />
        {/* Viewfinder overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-56 h-36 border-2 border-fifa-mint/60 rounded-lg shadow-glow" />
        </div>
        {!videoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-fifa-dark/80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fifa-mint mx-auto mb-2" />
              <p className="font-retro text-[8px] text-fifa-mint/60">Starting camera…</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={capturePhoto}
          disabled={!videoReady}
          className="flex-1 btn-primary py-3 disabled:opacity-30"
        >
          📸 Capture
        </button>
        <button onClick={stopCamera} className="btn-secondary px-4 py-3">
          Cancel
        </button>
      </div>
      <p className="font-headline text-[10px] text-white/30 text-center">
        Align card inside the frame, then tap Capture
      </p>
    </div>
  );
}
