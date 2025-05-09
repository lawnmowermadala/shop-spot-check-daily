"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const CrossPlatformBarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingLegacyMode, setUsingLegacyMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  // Try modern API first, then fallback to legacy camera
  useEffect(() => {
    const initScanner = async () => {
      try {
        // Check for modern API support
        // @ts-ignore
        if ('BarcodeDetector' in window) {
          await setupModernScanner();
        } else {
          setUsingLegacyMode(true);
          await setupLegacyCamera();
        }
      } catch (err) {
        console.error('Scanner init error:', err);
        setError(getErrorMessage(err));
        setUsingLegacyMode(true);
      }
    };

    initScanner();

    return () => {
      if (videoRef.current?.srcObject) {
        // @ts-ignore
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const setupModernScanner = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    // @ts-ignore
    const barcodeDetector = new BarcodeDetector({
      formats: ['ean_13', 'upc_a', 'code_128', 'code_39']
    });

    const detectFrame = async () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          // @ts-ignore
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            onScan(barcodes[0].rawValue);
          }
        } catch (err) {
          console.error('Detection error:', err);
        }
      }
      requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const setupLegacyCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please enter barcode manually.');
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return 'Camera permission denied. Please allow camera access.';
      }
      if (error.name === 'NotFoundError') {
        return 'No camera found on this device.';
      }
    }
    return 'Barcode scanning not available. Please enter manually.';
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      onClose();
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600 font-medium">{error}</p>
          <form onSubmit={handleManualSubmit} className="mt-4 space-y-2">
            <Input
              placeholder="Enter barcode manually"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
            />
            <Button type="submit" className="w-full">
              Submit Barcode
            </Button>
          </form>
        </div>
      ) : (
        <>
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-4 border-primary pointer-events-none" />
            {usingLegacyMode && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/70 text-white p-4 rounded-lg text-center">
                  <p>Point camera at barcode</p>
                  <p className="text-sm mt-1">Then enter the number below</p>
                </div>
              </div>
            )}
          </div>

          {usingLegacyMode && (
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Input
                placeholder="Enter barcode manually"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
              />
              <Button type="submit" className="w-full">
                Submit Barcode
              </Button>
            </form>
          )}
        </>
      )}
      
      <div className="flex justify-center">
        <Button variant="outline" onClick={onClose}>
          Close Scanner
        </Button>
      </div>
    </div>
  );
};

export default CrossPlatformBarcodeScanner;
