"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let barcodeDetector: any = null;
    let animationFrameId: number;

    const startScanning = async () => {
      try {
        setIsScanning(true);
        
        // Check for browser support
        if (!('BarcodeDetector' in window)) {
          throw new Error('Barcode scanning not supported in your browser. Try Chrome or Edge.');
        }

        // Initialize barcode detector
        // @ts-ignore
        barcodeDetector = new BarcodeDetector({
          formats: ['ean_13', 'upc_a', 'code_128', 'code_39']
        });

        // Get camera stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        const detectBarcode = async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              // @ts-ignore
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                onScan(barcodes[0].rawValue);
                stopScanning();
              }
            } catch (err) {
              console.error('Barcode detection error:', err);
            }
          }
          animationFrameId = requestAnimationFrame(detectBarcode);
        };

        detectBarcode();

      } catch (err) {
        console.error('Error starting scanner:', err);
        setError(err instanceof Error ? err.message : 'Failed to access camera');
        stopScanning();
      }
    };

    const stopScanning = () => {
      setIsScanning(false);
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-red-500 mt-1">
            You can still manually enter the barcode below.
          </p>
        </div>
      ) : (
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 border-4 border-primary pointer-events-none" />
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-white text-lg font-medium">
                Scanning for barcodes...
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-center">
        <Button variant="outline" onClick={onClose}>
          Close Scanner
        </Button>
      </div>
    </div>
  );
};

export default BarcodeScanner;
