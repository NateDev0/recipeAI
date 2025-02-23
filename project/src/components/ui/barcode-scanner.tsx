import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Button } from './button';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    let mounted = true;

    async function startScanning() {
      try {
        setIsScanning(true);
        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        if (!videoInputDevices.length) {
          throw new Error('No camera found');
        }

        // Use the first available camera
        const selectedDeviceId = videoInputDevices[0].deviceId;
        
        if (!mounted) return;

        if (videoRef.current) {
          await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result, error) => {
              if (result && mounted) {
                onScan(result.getText());
                onClose();
              }
              if (error && error.name !== 'NotFoundException') {
                console.error('Scanning error:', error);
              }
            }
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to start camera');
        }
        setIsScanning(false);
      }
    }

    startScanning();

    return () => {
      mounted = false;
      if (codeReaderRef.current) {
        codeReaderRef.current.stopStreams();
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">Scan Barcode</h3>
          <p className="text-sm text-gray-500">
            Position the barcode within the camera view
          </p>
        </div>

        {error ? (
          <div className="text-red-600 text-center p-4">
            {error}
          </div>
        ) : (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-1 bg-primary/50 animate-[scanner_2s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}