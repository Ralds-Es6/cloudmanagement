import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, RotateCcw, FileText, Loader2, XCircle } from 'lucide-react';
import { getDocuments, restoreFromTrash, deletePermanently } from '../services/api';
import { toast } from 'sonner';

export default function DeletedFilesPage() {
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDeleted = async () => {
    try {
      setLoading(true);
      const res = await getDocuments({ isDeleted: 'true' });
      if (res.data) {
        setDeletedFiles(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch trash files:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
    const handleRefresh = () => fetchDeleted();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  const handleRestore = async (id) => {
    try {
      await restoreFromTrash(id);
      setDeletedFiles((prev) => prev.filter((f) => f._id !== id));
      window.dispatchEvent(new Event('document-uploaded'));
      toast.success('Document restored to original folder');
    } catch (err) {
      toast.error(`Restore failed: ${err.message}`);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm('Permanently delete this document from database and storage?')) return;
    try {
      await deletePermanently(id);
      setDeletedFiles((prev) => prev.filter((f) => f._id !== id));
      window.dispatchEvent(new Event('document-uploaded'));
      toast.success('Document permanently deleted');
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently delete all items in the trash?')) return;
    try {
      await Promise.all(deletedFiles.map((f) => deletePermanently(f._id)));
      setDeletedFiles([]);
      window.dispatchEvent(new Event('document-uploaded'));
      toast.success('Trash emptied successfully');
    } catch (err) {
      toast.error(`Empty trash error: ${err.message}`);
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
    if (!isoString) return 'Recent';
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Deleted Files
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-700 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> {deletedFiles.length} In Trash
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Items in trash can be restored. Permanently deleting will purge them from storage.
          </p>
        </div>

        {deletedFiles.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl flex items-center space-x-2 shadow-md shadow-rose-900/10 transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {/* Retention Notice Box */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center space-x-3 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Automatic retention policy active. Restoring a file will return it to your workspace.
        </span>
      </div>

      {/* Deleted Items Table */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#4361ee]" />
          <span>Checking trash...</span>
        </div>
      ) : deletedFiles.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center">
          <Trash2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">Trash is empty</h3>
          <p className="text-xs text-slate-400 mt-1">
            No deleted documents found in your workspace.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Deleted On</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {deletedFiles.map((file) => (
                <tr key={file._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-slate-900">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="truncate max-w-sm">{file.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{formatSize(file.fileSize)}</td>
                  <td className="py-3.5 px-4 text-slate-400">{formatDate(file.deletedAt || file.updatedAt)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleRestore(file._id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(file._id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
