import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Folder,
  FolderPlus,
  Shield,
  Loader2,
  AlertCircle,
  HardDrive,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import {
  resolveShareToken,
  getSharedFolderContents,
  downloadDocument,
  pinSharedItem,
} from '../services/api';
import FolderCard from '../components/FolderCard';
import { useAuth } from '../context/AuthContext';

export default function SharedLinkPage() {
  const { token } = useParams();
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareInfo, setShareInfo] = useState(null);

  // Folder subtree state
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [subfolders, setSubfolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [folderNavTrail, setFolderNavTrail] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [pinned, setPinned] = useState(false);

  const fetchResolved = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await resolveShareToken(token);
      if (res.data) {
        setShareInfo(res);
        if (res.type === 'folder') {
          setCurrentFolderId(res.data._id);
          setFolderNavTrail([{ id: res.data._id, name: res.data.name }]);
          await fetchContents(res.data._id);
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'This link is invalid, expired, or has been disabled by the owner.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchContents = async (targetFolderId) => {
    try {
      const res = await getSharedFolderContents(token, targetFolderId);
      if (res.data) {
        setSubfolders(res.data.subfolders || []);
        setDocuments(res.data.documents || []);
      }
    } catch (err) {
      console.warn('Failed to load shared folder contents:', err.message);
    }
  };

  useEffect(() => {
    fetchResolved();
  }, [token]);

  // Auto-pin to logged-in user's "Shared with me"
  useEffect(() => {
    if (isAuthenticated && shareInfo && !pinned) {
      pinSharedItem(token)
        .then(() => setPinned(true))
        .catch(() => {});
    }
  }, [isAuthenticated, shareInfo, token]);

  const handleEnterSubfolder = async (sub) => {
    setCurrentFolderId(sub._id);
    setFolderNavTrail((prev) => [...prev, { id: sub._id, name: sub.name }]);
    await fetchContents(sub._id);
  };

  const handleBreadcrumbClick = async (index) => {
    const target = folderNavTrail[index];
    const newTrail = folderNavTrail.slice(0, index + 1);
    setFolderNavTrail(newTrail);
    setCurrentFolderId(target.id);
    await fetchContents(target.id);
  };

  const handleDownloadFile = async (docItem) => {
    try {
      setDownloadingId(docItem._id);
      await downloadDocument(docItem._id, docItem.originalName || docItem.name);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fc] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#4361ee] mb-3" />
        <p className="text-xs font-semibold text-slate-500">Resolving secure share link...</p>
      </div>
    );
  }

  if (error || !shareInfo) {
    return (
      <div className="min-h-screen bg-[#f6f8fc] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">{error}</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#4361ee] text-white text-xs font-bold hover:bg-[#3651d4] transition-colors"
          >
            Go to Document Manager
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER SINGLE DOCUMENT SHARE VIEW (Total Folder Blindness!)
  // -------------------------------------------------------------
  if (shareInfo.type === 'document') {
    const doc = shareInfo.data;
    const isDownloading = downloadingId === doc._id;

    return (
      <div className="min-h-screen bg-[#f6f8fc] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#4361ee]/20 selection:text-[#4361ee]">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#4361ee] text-white shadow-md shadow-[#4361ee]/25 mb-3">
              <Share2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Shared Document Access</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure single-file view with isolated folder boundaries
            </p>
          </div>

          {/* Document Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-xl shadow-slate-200/50 space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4361ee] flex items-center justify-center shrink-0">
                {doc.category === 'Spreadsheet' ? (
                  <FileSpreadsheet className="w-7 h-7" />
                ) : (
                  <FileText className="w-7 h-7" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-900 truncate">{doc.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">{formatSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold uppercase">
                    {doc.extension || 'FILE'}
                  </span>
                  <span>•</span>
                  <span>Shared by {doc.author || 'User'}</span>
                </div>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-500 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Isolated File Access ({doc.permission === 'editor' ? 'Editor' : 'Viewer'})</span>
              </div>
              {pinned && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Added to your Shared
                </span>
              )}
            </div>

            {/* Download Button */}
            <button
              onClick={() => handleDownloadFile(doc)}
              disabled={isDownloading}
              className="w-full py-3 px-5 bg-[#4361ee] hover:bg-[#3652db] disabled:opacity-60 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-[#4361ee]/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Document</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-6">
            <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-slate-600">
              Open Document Manager →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER FOLDER SUBTREE SHARE VIEW (Virtual Root Enforced!)
  // -------------------------------------------------------------
  const folder = shareInfo.data;

  return (
    <div className="min-h-screen bg-[#f6f8fc] p-6 sm:p-10 lg:p-12 selection:bg-[#4361ee]/20 selection:text-[#4361ee]">
      <div className="max-w-6xl mx-auto space-y-7">
        {/* Virtual Root Header */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          {/* Breadcrumb clamped to Virtual Root (NO UPWARD CLIMBING!) */}
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-3 overflow-x-auto">
            <span className="font-semibold text-slate-400">Shared Link</span>
            <span>›</span>
            {folderNavTrail.map((item, index) => {
              const isLast = index === folderNavTrail.length - 1;
              return (
                <React.Fragment key={item.id}>
                  {index > 0 && <span>›</span>}
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    disabled={isLast}
                    className={`font-semibold transition-colors cursor-pointer ${
                      isLast ? 'text-slate-900 cursor-default' : 'text-[#4361ee] hover:underline'
                    }`}
                  >
                    {item.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4361ee] flex items-center justify-center shrink-0">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {folderNavTrail[folderNavTrail.length - 1]?.name}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Shared by {folder.ownerName} · {folder.permission === 'editor' ? 'Editor Access' : 'Viewer Access (Read-Only)'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {pinned && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Added to your Shared
                </span>
              )}
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Subfolders Grid */}
        {subfolders.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Folder className="w-4 h-4 text-[#4361ee]" />
              <span>Subfolders ({subfolders.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subfolders.map((sub) => (
                <FolderCard
                  key={sub._id}
                  folder={sub}
                  onClick={() => handleEnterSubfolder(sub)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Documents Table */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#4361ee]" />
            <span>Documents ({documents.length})</span>
          </h2>

          {documents.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">No documents inside this shared folder.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {documents.map((item) => {
                    const isDownloading = downloadingId === item._id;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-[#4361ee]">
                              {item.category === 'Spreadsheet' ? (
                                <FileSpreadsheet className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <span className="font-semibold text-slate-800 truncate max-w-sm">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{formatSize(item.fileSize)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDownloadFile(item)}
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
          )}
        </section>
      </div>
    </div>
  );
}

