import React, { useState } from 'react';
import { ShieldCheck, Link2, Check } from 'lucide-react';

export default function PrivacyWidget() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      {/* Icon & Title */}
      <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-2.5">
        <ShieldCheck className="w-4 h-4 text-[#4361ee]" />
        <span>Private to your team</span>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
        Only invited members can open and edit files in this folder.
      </p>

      {/* Copy Link Button */}
      <button
        onClick={handleCopy}
        className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 shadow-2xs transition-all cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600">Copied link!</span>
          </>
        ) : (
          <>
            <Link2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Copy folder link</span>
          </>
        )}
      </button>
    </div>
  );
}
