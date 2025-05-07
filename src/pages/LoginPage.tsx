import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, QrCode, Key, Smartphone, Camera, CameraOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { useIsMobile } from "@/hooks/use-mobile";

// Define your routes
const ROUTES = {
  ADMIN: '/admin',
  PRODUCTION: '/production',
  TASKS: '/tasks',
  HOME: '/',
  LOGIN: '/login'
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithQR, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [defaultTab, setDefaultTab] = useState<string>('password');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();
  
  // Set default tab based on device type
  useEffect(() => {
    if (isMobile) {
      setDefaultTab('qrcode');
    }
  }, [isMobile]);

  // Redirect based on role after login
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || getDefaultRoute(user.role);
      
      // Validate the route before navigating
      const validRoutes = Object.values(ROUTES);
      const safeRoute = validRoutes.includes(from) ? from : ROUTES.HOME;
      
      navigate(safeRoute, { replace: true });
    }
  }, [user, navigate, location.state]);

  const getDefaultRoute = (role: string) => {
    switch (role) {
      case 'admin':
        return ROUTES.ADMIN;
      case 'supervisor':
        return ROUTES.PRODUCTION;
      case 'staff':
        return ROUTES.TASKS;
      default:
        return ROUTES.HOME;
    }
  };

  // Start camera for QR scanning
  const startCamera = async () => {
    try {
      setCameraError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setCameraActive(false);
      setCameraError('Camera access denied. Please check permissions.');
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualQRInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput) {
      toast.error('Please enter a QR code');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithQR(qrInput);
      toast.success('Login successful!');
    } catch (error) {
      toast.error('Invalid QR code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Kitchen & Bakery</h1>
          <p className="text-gray-500">Production Management System</p>
          {isMobile && (
            <div className="mt-2 flex items-center justify-center text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4 mr-1" /> 
              Mobile device detected
            </div>
          )}
        </div>

        <Tabs 
          defaultValue={defaultTab} 
          className="w-full"
          onValueChange={(tab) => {
            if (tab === 'qrcode' && isMobile) {
              startCamera();
            } else {
              stopCamera();
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">
              <Key className="mr-2 h-4 w-4" />
              Password
            </TabsTrigger>
            <TabsTrigger value="qrcode">
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Password Login</CardTitle>
                <CardDescription>
                  Enter your username and password to access the system
                </CardDescription>
              </CardHeader>
              <form onSubmit={handlePasswordLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-8"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="qrcode">
            <Card>
              <CardHeader>
                <CardTitle>QR Code Login</CardTitle>
                <CardDescription>
                  {isMobile ? 'Scan your QR code or enter manually' : 'Enter your QR code'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isMobile && (
                  <>
                    <div className="relative aspect-square w-full mb-4 rounded-lg overflow-hidden bg-black">
                      {cameraActive ? (
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          {cameraError ? 'Camera unavailable' : 'Camera inactive'}
                        </div>
                      )}
                      <div className="absolute inset-0 border-4 border-primary rounded-lg pointer-events-none" />
                    </div>
                    
                    {cameraError && (
                      <div className="text-red-500 text-sm mb-2">{cameraError}</div>
                    )}
                  </>
                )}
                
                <form onSubmit={handleManualQRInput}>
                  <div className="space-y-2">
                    <Label htmlFor="qr-input">QR Code</Label>
                    <Input
                      id="qr-input"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="Enter QR code (letters or numbers)"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Submit QR Code"}
                  </Button>
                </form>
              </CardContent>
              {isMobile && (
                <CardFooter className="flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={cameraActive ? stopCamera : startCamera}
                    disabled={!!cameraError}
                  >
                    {cameraActive ? (
                      <>
                        <CameraOff className="h-4 w-4 mr-2" />
                        Stop Camera
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LoginPage;
