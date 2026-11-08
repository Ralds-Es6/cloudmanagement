import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Trash2,
  Star,
  Search,
  Plus,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  getDocuments,
  downloadDocument,
  toggleFavorite,
  moveToTrash,
} from '../services/api';

export default function DocumentsPage() {
  const context = useOutletContext();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await getDocuments({ isDeleted: false });
      if (res.data) {
        setDocuments(res.data);
      }
    } catch (err) {
      console.warn('Backend documents fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    const handleRefresh = () => fetchDocs();
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

  const handleToggleFavorite = async (id) => {
    try {
      await toggleFavorite(id);
      setDocuments((prev) =>
        prev.map((d) => (d._id === id ? { ...d, isFavorite: !d.isFavorite } : d))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Move this document to trash?')) return;
    try {
      await moveToTrash(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '1.2 MB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="px-6 sm:px-10 lg:px-12 py-7 w-full space-y-7">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Documents
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#e0e7ff] text-[#4361ee]">
              {documents.length} Files
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Strictly document files (PDF, DOCX, XLSX, TXT, CSV). Only document types are allowed.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchDocs}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={context?.openCreate}
            className="bg-[#4361ee] hover:bg-[#3652db] text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl flex items-center space-x-2 shadow-md shadow-blue-900/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter documents by name..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee]"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
          Showing {filteredDocs.length} of {documents.length}
        </span>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#4361ee]" />
          <span>Loading documents...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No documents found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Upload your first document (PDF, DOCX, XLSX, TXT) to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => {
            const isDownloading = downloadingId === doc._id;
            return (
              <div
                key={doc._id}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#4361ee] flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(doc._id)}
                      className="text-slate-300 hover:text-amber-400 p-1.5 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          doc.isFavorite
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1 group-hover:text-[#4361ee] transition-colors truncate">
                    {doc.name}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    {doc.folder || 'Team Folder'} · {formatSize(doc.fileSize)}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Owner: {doc.ownerName || doc.owner || doc.author || 'Administrator'}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading}
                      title="Download Document"
                      className="p-2 text-slate-600 hover:text-[#4361ee] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#4361ee]" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(doc._id)}
                      title="Move to Trash"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
