import React from 'react';
import { UploadCloud } from 'lucide-react';

export default function PageDropOverlay({ visible, destinationLabel = 'My Files' }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-[#4361ee]/10 backdrop-blur-[2px] p-6 animate-in fade-in duration-150">
      <div className="bg-white/95 border-2 border-dashed border-[#4361ee] rounded-3xl px-10 py-8 shadow-2xl shadow-[#4361ee]/15 text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#4361ee] flex items-center justify-center mx-auto mb-3">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Drop files or folders to upload
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Destination:{' '}
          <span className="font-semibold text-[#4361ee]">{destinationLabel}</span>
        </p>
      </div>
    </div>
  );
}

