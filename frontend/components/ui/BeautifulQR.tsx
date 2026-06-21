"use client";

import { QRCodeSVG } from "qrcode.react";

interface BeautifulQRProps {
  value: string;
  size?: number;
}

export function BeautifulQR({ value, size = 200 }: BeautifulQRProps) {
  return (
    <div className="relative inline-block">
      {/* QR Code with refined styling */}
      <div className="relative rounded-3xl bg-white p-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-gray-100">
        <QRCodeSVG
          value={value}
          size={size - 32} // Account for padding
          level="H"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#000000"
        />
        
        {/* Center logo/circle overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-12 w-12 rounded-full bg-white shadow-sm border-2 border-gray-100 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-600" />
          </div>
        </div>
      </div>
      
      {/* Subtle shadow effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/5 to-violet-600/5 blur-xl" />
    </div>
  );
}
