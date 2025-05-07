
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QrCode, Camera, Keyboard } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/components/ui/sonner";

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isLoading: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, isLoading }) => {
  const [qrCode, setQrCode] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [usingCamera, setUsingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      onScan(qrCode.trim());
    }
  };
  
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Use the rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setUsingCamera(true);
        
        // Start scanning for QR codes
        scanQRCode();
      }
    } catch (err) {
      toast.error("Unable to access camera. Please check permissions or use manual entry.");
      console.error("Error accessing camera:", err);
      setUseManualEntry(true);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setUsingCamera(false);
    }
  };
  
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.videoWidth === 0) {
      // If video isn't ready yet or context isn't available, try again in a moment
      setTimeout(scanQRCode, 100);
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // In a real app, this would use a QR code scanning library
    // For this demo, we'll use a mock detection after a few seconds
    if (usingCamera) {
      setTimeout(() => {
        toast.info("In a real app, QR codes would be detected automatically");
      }, 3000);
    }
    
    // Continue scanning
    if (usingCamera) {
      setTimeout(scanQRCode, 500);
    }
  };
  
  useEffect(() => {
    return () => {
      // Clean up camera when component unmounts
      stopCamera();
    };
  }, []);
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6 space-y-4">
        {usingCamera ? (
          <div className="space-y-4">
            <div className="relative">
              <div className="overflow-hidden rounded-lg relative aspect-video">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-dashed border-primary opacity-50 flex items-center justify-center">
                  <div className="text-primary text-sm bg-background/80 px-2 py-1 rounded">
                    Align QR code here
                  </div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex flex-col space-y-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  stopCamera();
                  setUseManualEntry(true);
                }}
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Switch to Manual Entry
              </Button>
            </div>
          </div>
        ) : useManualEntry ? (
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
                onClick={() => {
                  setUseManualEntry(false);
                  if (isMobile) {
                    startCamera();
                  }
                }}
              >
                <Camera className="mr-2 h-4 w-4" />
                {isMobile ? "Use Camera" : "Back to Options"}
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
                {isMobile ? "Use your camera to scan a QR code or enter it manually" : 
                "Choose how you want to enter your QR code"}
              </p>
            </div>
            
            <div className="flex flex-col space-y-2">
              {isMobile && (
                <Button 
                  onClick={startCamera}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Scan QR Code with Camera
                </Button>
              )}
              <Button 
                onClick={() => setUseManualEntry(true)}
                variant={isMobile ? "outline" : "default"}
              >
                <Keyboard className="mr-2 h-4 w-4" />
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
