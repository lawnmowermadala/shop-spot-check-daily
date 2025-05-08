
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Quagga } from '@ericblade/quagga2';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (scannerRef.current) {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment",
            width: 480,
            height: 320,
          },
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "code_128_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader"
          ]
        },
      }, (err) => {
        if (err) {
          console.error("Quagga initialization failed:", err);
          return;
        }
        
        Quagga.start();
        setInitialized(true);
        
        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            onScan(result.codeResult.code);
            
            // Stop scanning after successful detection
            Quagga.stop();
          }
        });
      });
    }
    
    return () => {
      if (initialized) {
        Quagga.stop();
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div ref={scannerRef} className="border rounded overflow-hidden">
        <div style={{ width: '100%', height: '240px', position: 'relative' }}>
          {!initialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <p>Loading camera...</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-500">
        Point your camera at a barcode, or enter the code manually below
      </div>
      
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Enter barcode manually"
          className="flex-1 p-2 border rounded"
        />
        <Button type="submit">Submit</Button>
      </form>
    </div>
  );
};

export default BarcodeScanner;
