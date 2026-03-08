'use client';

import { useState, useRef, useEffect } from 'react';

interface CardUploaderProps {
  onPlayerAdded: (player: any) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  userId: string;
}

export default function CardUploader({ onPlayerAdded, onError, onSuccess, userId }: CardUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Attach stream to video element after React renders the video element
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    setVideoReady(false);

    const onReady = () => {
      setVideoReady(true);
      video.play().catch(() => {});
    };

    // loadeddata fires when the first frame is available
    video.addEventListener('loadeddata', onReady);
    // Also handle case where video is already ready
    if (video.readyState >= 2) {
      onReady();
    }

    return () => {
      video.removeEventListener('loadeddata', onReady);
    };
  }, [stream, useCamera]);

  // Start webcam
  const startCamera = async () => {
    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: { ideal: 'environment' },
          },
        });
      } catch {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      setStream(mediaStream);
      setUseCamera(true); // render the video element, then useEffect attaches stream
    } catch (error) {
      console.error('Error accessing camera:', error);
      onError?.('Could not access camera. Please check permissions and try again.');
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setVideoReady(false);
    setUseCamera(false);
  };

  // Capture photo from webcam
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      onError?.('Camera not ready. Please try again.');
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) {
      onError?.('Could not access camera canvas.');
      return;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      onError?.('Camera video not ready. Please wait a moment and try again.');
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
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

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await analyzeCard(file);
  };

  // Analyze card with Gemini AI
  const analyzeCard = async (file: File) => {
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/analyze-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      if (!response.ok) throw new Error('Failed to analyze card');
      const result = await response.json();
      console.log('API result:', result);

      if (result.error) {
        let userMessage = result.error;
        if (result.error.includes('basketball')) {
          userMessage = '🏀 That looks like a basketball card! Please upload a soccer/football player card instead.';
        } else if (result.error.includes('baseball')) {
          userMessage = '⚾ That appears to be a baseball card! Please upload a soccer/football player card instead.';
        } else if (result.error.includes('American football') || result.error.includes('NFL')) {
          userMessage = '🏈 That looks like an American football card! Please upload a soccer/football player card instead.';
        } else if (result.error.includes('Cannot read') || result.error.includes('not clear')) {
          userMessage = '📸 Card image is unclear. Please try taking a clearer photo with better lighting.';
        } else if (result.error.includes('not a') && result.error.includes('card')) {
          userMessage = '🃏 Please upload a clear photo of a soccer/football player card.';
        }
        onError?.(userMessage);
        return;
      }

      if (!result.name || !result.position || typeof result.rating !== 'number') {
        onError?.('Card analyzed but missing expected data. Please try uploading a different card.');
        return;
      }

      onPlayerAdded(result);
      onSuccess?.(`⚽ ${result.name} added to your roster! (${result.position} - Rating: ${result.rating})`);
    } catch (error) {
      console.error('Error analyzing card:', error);
      onError?.('Failed to analyze card. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-4">
      {!useCamera ? (
        <>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="text-4xl mb-2">📸</div>
              <p className="text-lg font-semibold mb-1">
                {uploading ? 'Analyzing card...' : 'Upload Player Card'}
              </p>
              <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
            </label>
          </div>

          <button
            onClick={startCamera}
            disabled={uploading}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📷</span>
            Take Photo with Camera
          </button>
        </>
      ) : (
        <>
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto max-h-96 object-cover"
              style={{ minHeight: '300px' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={capturePhoto}
              disabled={uploading || !videoReady}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {uploading ? 'Analyzing...' : '📸 Capture Photo'}
            </button>
            <button
              onClick={stopCamera}
              disabled={uploading}
              className="bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-sm text-gray-600 text-center">
            Position the card in the frame and tap Capture
          </p>
        </>
      )}

      {uploading && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Analyzing card with AI...</p>
        </div>
      )}
    </div>
  );
}
