'use client';

import { useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeModalProps {
  url: string;
  show: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ url, show, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const downloadQR = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'snipit-sh-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 p-6 rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white text-lg font-semibold mb-4 text-center">
          Scan to Share
        </h3>
        <div className="bg-white p-4 rounded-lg" ref={canvasRef}>
          <QRCodeCanvas value={url} size={200} />
        </div>
        <p className="text-slate-400 text-sm mt-4 text-center max-w-xs break-all">
          {url}
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={downloadQR}
            className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition"
          >
            ⬇️ Download QR
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
