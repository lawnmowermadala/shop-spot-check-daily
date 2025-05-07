
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QrCode } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isLoading: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, isLoading }) => {
  const [qrCode, setQrCode] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      onScan(qrCode.trim());
    }
  };

  // In a real app, this would be replaced with a camera-based QR scanner
  // For this demo, we're simulating with manual entry
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        {useManualEntry ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-center font-medium">Enter QR Code Manually</h3>
            </div>
            
            <div className="space-y-2">
              <InputOTP maxLength={8} value={qrCode} onChange={setQrCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button type="submit" disabled={qrCode.length < 8 || isLoading}>
                {isLoading ? "Verifying..." : "Login with QR Code"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setUseManualEntry(false)}
              >
                Back to Options
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-center font-medium">QR Code Login</h3>
              <p className="text-center text-sm text-gray-500">
                In a real app, you would use your device camera to scan the QR code.
              </p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={() => setUseManualEntry(true)}
              >
                Manual QR Entry
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRScanner;
