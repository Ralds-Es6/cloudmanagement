import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Folder,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  Download,
  Trash2,
  Loader2,
  Lock,
  Plus,
  UploadCloud,
  Share2,
  Pin,
  Star,
} from 'lucide-react';
import {
  getDocuments,
  getFolders,
  downloadDocument,
  moveToTrash,
  togglePinDocument,
  toggleFavorite,
} from '../services/api';
import FolderCard from '../components/FolderCard';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function MyFilesPage() {
  const navigate = useNavigate();
  const context = useOutletContext();
  const { user } = useAuth();

  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [sharingItem, setSharingItem] = useState(null);

  const fetchMyData = async () => {
    try {
      setLoading(true);
      const [foldersRes, docsRes] = await Promise.all([
        getFolders({ parentId: 'null' }),
        getDocuments({ isDeleted: false, folderId: 'null' }),
      ]);
      if (foldersRes.data) setFolders(foldersRes.data);
      if (docsRes.data) setFiles(docsRes.data);
    } catch (err) {
      console.warn('Could not fetch personal drive data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyData();
    const handleRefresh = () => fetchMyData();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  const handleDownload = async (file) => {
    try {
      setDownloadingId(file._id);
      toast.info(`Downloading "${file.name}"...`);
      await downloadDocument(file._id, file.originalName || file.name);
    } catch (err) {
      toast.error(`Download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!confirm('Move this document to trash?')) return;
    try {
      await moveToTrash(id);
      setFiles((prev) => prev.filter((d) => d._id !== id));
      toast.success('Document moved to trash');
    } catch (err) {
      toast.error(`Failed to move to trash: ${err.message}`);
    }
  };

  const handleTogglePinDoc = async (id) => {
    try {
      const res = await togglePinDocument(id);
      toast.success(res.message || 'Updated pin');
      fetchMyData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to pin document');
    }
  };

  const handleToggleFavoriteDoc = async (id) => {
    try {
      const res = await toggleFavorite(id);
      const isFav = res.data?.isFavorite;
      toast.success(isFav ? 'Document added to favorites' : 'Document removed from favorites');
      fetchMyData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update favorite');
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
    if (!isoString) return 'Recently';
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              My Files
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-[#4361ee] flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private Space
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Welcome, {user?.name || 'User'}! This is your private directory. Only you have access to these files and folders.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => context?.openCreate && context.openCreate({ initialTab: 'folder' })}
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-[#4361ee]" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => context?.openCreate && context.openCreate({ initialTab: 'upload' })}
            className="flex-1 sm:flex-none justify-center bg-[#4361ee] hover:bg-[#3652db] text-white text-xs sm:text-sm font-semibold px-4.5 py-2.5 rounded-xl flex items-center space-x-2 shadow-md shadow-[#4361ee]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#4361ee]" />
          <span>Loading your personal files...</span>
        </div>
      ) : (
        <>
          {/* Folders Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Folder className="w-4 h-4 text-[#4361ee]" />
                <span>Folders ({folders.length})</span>
              </h2>
            </div>

            {folders.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400">
                <FolderPlus className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">No folders yet</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Create your first folder to organize your personal documents.
                </p>
                <button
                  onClick={() => context?.openCreate && context.openCreate({ initialTab: 'folder' })}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-[#4361ee] text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Folder</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4.5">
                {folders.map((f) => (
                  <FolderCard
                    key={f._id}
                    folder={f}
                    onClick={() => navigate(`/folders/${encodeURIComponent(f.name)}`)}
                    onDeleteFolder={() => {
                      setFolders((prev) => prev.filter((item) => item._id !== f._id));
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Root Documents Section */}
          <section className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#4361ee]" />
                <span>Documents ({files.length})</span>
              </h2>
            </div>

            {files.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400">
                <UploadCloud className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">No loose documents in root</h3>
                <p className="text-xs text-slate-400">
                  Documents not inside any folder will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[520px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                        <th className="py-3 px-5">Name</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Uploaded</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {files.map((item) => {
                        const isDownloading = downloadingId === item._id;
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-[#4361ee] relative">
                                  {item.category === 'Spreadsheet' ? (
                                    <FileSpreadsheet className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                  {item.isPinned && (
                                    <span
                                      className="absolute -top-1 -right-1 p-0.5 bg-blue-600 text-white rounded-full shadow-xs"
                                      title="Pinned to top"
                                    >
                                      <Pin className="w-2.5 h-2.5 fill-white" />
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-sm">
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{formatSize(item.fileSize)}</td>
                            <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleToggleFavoriteDoc(item._id)}
                                  title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                  className={`p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors ${
                                    item.isFavorite ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                                  }`}
                                >
                                  <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-400 stroke-amber-500' : ''}`} />
                                </button>
                                <button
                                  onClick={() => handleTogglePinDoc(item._id)}
                                  title={item.isPinned ? 'Unpin from top' : 'Pin to top'}
                                  className="p-1.5 text-slate-400 hover:text-[#4361ee] rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'text-[#4361ee] fill-[#4361ee]/20' : ''}`} />
                                </button>
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
                                <button
                                  onClick={() => setSharingItem({ item, type: 'document' })}
                                  title="Share Document Link"
                                  className="p-1.5 text-slate-400 hover:text-[#4361ee] rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDoc(item._id)}
                                  title="Move to Trash"
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* Share Modal for single Document or Folder */}
      {sharingItem && (
        <ShareModal
          isOpen={!!sharingItem}
          onClose={() => setSharingItem(null)}
          item={sharingItem.item}
          type={sharingItem.type}
          onUpdated={fetchMyData}
        />
      )}
    </main>
  );
}
