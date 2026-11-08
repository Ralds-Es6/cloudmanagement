import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MoreHorizontal,
  ArrowRight,
  FileText,
  CheckCircle2,
  Download,
  Star,
  Loader2,
} from 'lucide-react';
import { getDocuments, downloadDocument } from '../services/api';

export default function PinnedFiles() {
  const [pinnedFiles, setPinnedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchPinned = async () => {
    try {
      setLoading(true);
      const res = await getDocuments({ isFavorite: 'true', isDeleted: false });
      if (res.data) {
        setPinnedFiles(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch pinned files:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPinned();
    const handleRefresh = () => fetchPinned();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc._id);
      await downloadDocument(doc._id, doc.originalName || doc.name);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Pinned for the team ({pinnedFiles.length})
        </h2>
        <NavLink
          to="/documents"
          className="flex items-center space-x-1.5 text-[#4361ee] hover:text-[#334ed6] text-xs sm:text-sm font-semibold cursor-pointer"
        >
          <span>View all documents</span>
          <ArrowRight className="w-4 h-4" />
        </NavLink>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#4361ee]" />
          <span className="text-xs">Loading pinned files...</span>
        </div>
      ) : pinnedFiles.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center shadow-2xs mb-5">
          <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-slate-700">No pinned documents yet</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Star documents from the Documents page to feature them here for your team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {pinnedFiles.map((doc) => {
            const isDownloading = downloadingId === doc._id;
            return (
              <div
                key={doc._id}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#4361ee] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={isDownloading}
                    title="Download document"
                    className="p-1.5 text-slate-400 hover:text-[#4361ee] hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#4361ee]" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1 truncate group-hover:text-[#4361ee] transition-colors">
                  {doc.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mb-5">
                  {doc.folder || 'Team Folder'} · {formatSize(doc.fileSize)}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span>Owner: {doc.ownerName || doc.owner || doc.author || 'Administrator'}</span>
                  <span className="text-emerald-600 font-medium">★ Pinned</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sync Status Bottom Line */}
      <div className="flex items-center space-x-2.5 text-xs text-slate-400 pt-1">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span>Everything is up to date. Synced with database & Cloudflare R2.</span>
      </div>
    </section>
  );
}
