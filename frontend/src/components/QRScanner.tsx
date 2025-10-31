import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-reader';

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          stopScanner();
          onScan(decodedText);
        },
        (errorMessage) => {
          // Ignore frequent scanning errors
        }
      );

      setScanning(true);
      setError('');
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full max-w-md p-6 rounded-lg" style={{ backgroundColor: 'var(--glass-bg)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
              Scan QR Code
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-opacity-20 transition-all"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <X className="h-5 w-5" style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div className="mb-4">
          <div
            id={qrCodeRegionId}
            className="rounded-lg overflow-hidden"
            style={{ width: '100%', minHeight: '300px' }}
          />
        </div>

        <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
          {scanning ? 'Position the QR code within the frame' : 'Initializing camera...'}
        </p>
      </div>
    </div>
  );
}
