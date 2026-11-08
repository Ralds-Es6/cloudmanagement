import React, { useState, useEffect } from 'react';
import { Clock, FileText, Download, Loader2 } from 'lucide-react';
import { getDocuments, downloadDocument } from '../services/api';

export default function RecentsPage() {
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchRecents = async () => {
    try {
      setLoading(true);
      const res = await getDocuments({ isDeleted: false });
      if (res.data) {
        setRecentFiles(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch recents:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecents();
    const handleRefresh = () => fetchRecents();
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

  const formatDate = (isoString) => {
    if (!isoString) return 'Just now';
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="px-6 sm:px-10 lg:px-12 py-7 w-full space-y-7">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Recents
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#e0e7ff] text-[#4361ee] flex items-center gap-1">
              <Clock className="w-3 h-3" /> {recentFiles.length} Recent Items
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Timeline of recent documents uploaded and managed in your workspace.
          </p>
        </div>
      </div>

      {/* Dynamic Activity List */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#4361ee]" />
          <span>Loading activity...</span>
        </div>
      ) : recentFiles.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No recent activity</h3>
          <p className="text-xs text-slate-400 mt-1">
            Documents you upload will appear in this timeline.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {recentFiles.map((item) => {
            const isDownloading = downloadingId === item._id;
            return (
              <div
                key={item._id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-[#4361ee]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm truncate max-w-sm">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Owner: {item.ownerName || item.owner || item.author || 'Administrator'} · {formatSize(item.fileSize)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-slate-400 font-medium">
                    {formatDate(item.createdAt)}
                  </span>
                  <button
                    onClick={() => handleDownload(item)}
                    disabled={isDownloading}
                    title="Download document"
                    className="p-1.5 text-slate-400 hover:text-[#4361ee] rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4361ee]" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
