import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, FileText, Download, Loader2, Folder } from 'lucide-react';
import { getDocuments, getFolders, downloadDocument } from '../services/api';
import FolderCard from '../components/FolderCard';

export default function SharedWithMePage() {
  const navigate = useNavigate();
  const [sharedFolders, setSharedFolders] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchShared = async () => {
    try {
      setLoading(true);
      const [foldersRes, docsRes] = await Promise.all([
        getFolders({ sharedOnly: 'true' }),
        getDocuments({ isDeleted: false, sharedOnly: 'true' }),
      ]);
      if (foldersRes.data) setSharedFolders(foldersRes.data);
      if (docsRes.data) setSharedFiles(docsRes.data);
    } catch (err) {
      console.warn('Could not fetch shared files/folders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShared();
    const handleRefresh = () => fetchShared();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  const handleDownload = async (file) => {
    try {
      setDownloadingId(file._id);
      await downloadDocument(file._id, file.originalName || file.name);
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

  const totalShared = sharedFolders.length + sharedFiles.length;

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Shared with me
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#e0e7ff] text-[#4361ee] flex items-center gap-1">
              <Share2 className="w-3 h-3" /> {totalShared} Shared Items
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Folders and documents shared with you by other users via secure links or direct collaboration.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#4361ee]" />
          <span>Loading shared items...</span>
        </div>
      ) : totalShared === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center">
          <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No shared items yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            When another user generates a share link or shares a folder/document with you, it will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {/* Shared Folders Section */}
          {sharedFolders.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Folder className="w-4 h-4 text-[#4361ee]" />
                <span>Shared Folders ({sharedFolders.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sharedFolders.map((f) => (
                  <FolderCard
                    key={f._id}
                    folder={f}
                    onClick={() => navigate(`/folders/${encodeURIComponent(f.name)}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Shared Documents Section */}
          {sharedFiles.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#4361ee]" />
                <span>Shared Documents ({sharedFiles.length})</span>
              </h2>
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                      <th className="py-3 px-5">Document</th>
                      <th className="py-3 px-4">Shared By</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {sharedFiles.map((item) => {
                      const isDownloading = downloadingId === item._id;
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-[#4361ee]">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-slate-900 truncate max-w-sm">
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-700 font-medium">
                              {item.author || item.ownerName || 'User'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">{formatSize(item.fileSize)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDownload(item)}
                              disabled={isDownloading}
                              title="Download Document"
                              className="p-1.5 text-slate-400 hover:text-[#4361ee] rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4361ee]" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
