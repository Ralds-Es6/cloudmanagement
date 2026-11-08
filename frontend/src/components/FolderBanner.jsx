import React, { useState, useEffect } from 'react';
import { Folder, UserPlus } from 'lucide-react';
import { getDocuments } from '../services/api';

export default function FolderBanner({ onInviteClick }) {
  const [fileCount, setFileCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await getDocuments({ isDeleted: false });
      if (res.data) {
        setFileCount(res.data.length);
      }
    } catch (err) {
      console.warn('Could not fetch banner count:', err.message);
    }
  };

  useEffect(() => {
    fetchCount();
    const handleRefresh = () => fetchCount();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  return (
    <div className="mb-7">
      {/* Sub Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs sm:text-sm mb-4">
        <span className="text-slate-400 font-medium hover:text-slate-600 cursor-pointer transition-colors">
          All Files
        </span>
        <span className="text-slate-300">›</span>
        <span className="text-slate-800 font-semibold">Team Folder</span>
      </div>

      {/* Hero Banner Card */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div className="flex items-start sm:items-center space-x-6">
          {/* Large Folder Icon */}
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white/95 border border-indigo-100/80 flex items-center justify-center text-[#4361ee] shadow-sm shrink-0">
            <Folder className="w-9 h-9 sm:w-10 sm:h-10 stroke-[1.8] fill-[#4361ee]/10" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Team Folder
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#e0e7ff] text-[#4361ee]">
                Workspace
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-2.5">
              One shared space for your documents, plans, and team files.
            </p>
            <div className="flex items-center space-x-2.5 text-xs text-slate-400 font-medium">
              <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
              <span>·</span>
              <span>Strictly Documents (Max 10MB)</span>
            </div>
          </div>
        </div>

        {/* Invite Action Button */}
        <div className="shrink-0">
          <button
            onClick={onInviteClick}
            className="bg-[#4361ee] hover:bg-[#3652db] text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl flex items-center space-x-2.5 shadow-md shadow-blue-900/10 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.2]" />
            <span>Invite members</span>
          </button>
        </div>
      </div>
    </div>
  );
}
