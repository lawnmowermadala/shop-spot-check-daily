
import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const StockPage = () => {
  const [showQRInfo, setShowQRInfo] = useState(false);

  const handleSimulateQRScan = () => {
    toast({
      title: "QR Code Scanned",
      description: "User identified via QR code. Access granted.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Stock Management</h1>
      <p className="mb-6 text-gray-600">
        Monitor inventory levels and manage stock for all bakery and kitchen products.
      </p>
      
      <div className="mb-6">
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowQRInfo(!showQRInfo)}
        >
          {showQRInfo ? "Hide QR Authentication Info" : "Show QR Authentication Info"}
        </Button>
      </div>

      {showQRInfo && (
        <div className="mb-6 p-4 border rounded-lg bg-blue-50">
          <h2 className="text-lg font-semibold mb-2">QR Code Authentication</h2>
          <p className="mb-3 text-sm">
            Staff can scan their unique QR code to authenticate and access inventory management.
          </p>
          <div className="flex justify-center mb-4">
            <div className="w-48 h-48 bg-white border flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs text-gray-500">QR Code would appear here</p>
                <p className="text-xs text-gray-500 mt-1">in a real implementation</p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleSimulateQRScan}
            className="w-full"
          >
            Simulate QR Code Scan
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            In production, this would use the device camera for scanning actual QR codes
          </p>
        </div>
      )}
      
      <div className="p-8 text-center border-2 border-dashed rounded-lg">
        <h2 className="text-lg font-medium text-gray-500">Stock Management Coming Soon</h2>
        <p className="text-sm text-gray-400 mt-2">
          This page is under development. Soon you'll be able to track stock levels and receive inventory alerts.
        </p>
      </div>
      
      <Navigation />
    </div>
  );
};

export default StockPage;
