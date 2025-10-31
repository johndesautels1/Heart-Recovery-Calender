import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, QrCode } from 'lucide-react';
import { Button } from './ui';

interface QRGeneratorProps {
  data: any;
  title: string;
  onClose: () => void;
}

export function QRGenerator({ data, title, onClose }: QRGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Convert SVG to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Download
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const jsonData = JSON.stringify(data, null, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full max-w-md p-6 rounded-lg" style={{ backgroundColor: 'var(--glass-bg)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-6 w-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-opacity-20 transition-all"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <X className="h-5 w-5" style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-4">
          <div
            ref={qrRef}
            className="p-4 rounded-lg mb-4"
            style={{ backgroundColor: 'white' }}
          >
            <QRCodeSVG
              value={jsonData}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>

          <Button
            onClick={downloadQR}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download QR Code
          </Button>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
          <p className="text-xs mb-2 font-medium" style={{ color: 'var(--muted)' }}>
            Data Preview:
          </p>
          <pre
            className="text-xs overflow-auto max-h-32"
            style={{ color: 'var(--ink)' }}
          >
            {jsonData}
          </pre>
        </div>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--muted)' }}>
          Scan this QR code to import data into another device
        </p>
      </div>
    </div>
  );
}
