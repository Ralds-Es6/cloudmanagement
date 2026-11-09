import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  Folder as FolderIcon,
  Share2,
  ChevronRight,
  FolderHeart,
  FileHeart,
  Sparkles,
} from 'lucide-react';
import {
  getDocuments,
  getFolders,
  toggleFavorite,
  downloadDocument,
} from '../services/api';
import FolderCard from '../components/FolderCard';
import ShareModal from '../components/ShareModal';
import { toast } from 'sonner';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favoriteFolders, setFavoriteFolders] = useState([]);
  const [favoriteFiles, setFavoriteFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'folders' | 'documents'
  const [downloadingId, setDownloadingId] = useState(null);
  const [sharingItem, setSharingItem] = useState(null);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const [foldersRes, docsRes] = await Promise.all([
        getFolders({ isFavorite: 'true' }),
        getDocuments({ isFavorite: 'true', isDeleted: false }),
      ]);

      if (foldersRes && foldersRes.data) {
        setFavoriteFolders(foldersRes.data);
      }
      if (docsRes && docsRes.data) {
        setFavoriteFiles(docsRes.data);
      }
    } catch (err) {
      console.warn('Could not fetch favorites:', err.message);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
    const handleRefresh = () => fetchFavorites();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  const handleUnfavoriteDoc = async (id, name) => {
    try {
      await toggleFavorite(id);
      setFavoriteFiles((prev) => prev.filter((f) => f._id !== id));
      toast.success(`Removed "${name || 'document'}" from favorites`);
      window.dispatchEvent(new Event('document-uploaded'));
    } catch (err) {
      toast.error(`Failed to update favorite: ${err.message}`);
    }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      setDownloadingId(doc._id);
      await downloadDocument(doc._id, doc.originalName || doc.name);
      toast.success(`Downloaded ${doc.name}`);
    } catch (err) {
      toast.error(`Download failed: ${err.message}`);
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
    if (!isoString) return 'Recently';
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalFavorites = favoriteFolders.length + favoriteFiles.length;

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Favorites
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#e0e7ff] text-[#4361ee] flex items-center gap-1.5 shadow-2xs">
              <Star className="w-3.5 h-3.5 fill-[#4361ee] stroke-[#4361ee]" />
              <span>{totalFavorites} Starred</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Quickly jump back into your starred folders and documents across any directory level.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-white/80 backdrop-blur-xs p-1 rounded-2xl border border-slate-200/80 shadow-2xs shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#4361ee] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalFavorites}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('folders')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'folders'
                ? 'bg-[#4361ee] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5" />
            <span>Folders</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === 'folders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {favoriteFolders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'bg-[#4361ee] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileHeart className="w-3.5 h-3.5" />
            <span>Documents</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === 'documents' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {favoriteFiles.length}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#4361ee]" />
          <span className="text-sm font-medium">Loading starred items...</span>
        </div>
      ) : totalFavorites === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-2xs">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-amber-500 border border-amber-100">
            <Star className="w-7 h-7 fill-amber-400 stroke-amber-500" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No favorites yet</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Star important folders or documents anywhere in your workspace for immediate, 1-click access here.
          </p>
          <button
            onClick={() => navigate('/my-files')}
            className="px-4 py-2 bg-[#4361ee] hover:bg-[#3652db] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Browse My Files
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: FAVORITE FOLDERS */}
          {(activeTab === 'all' || activeTab === 'folders') && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <FolderIcon className="w-4 h-4 text-[#4361ee]" />
                  <span>Favorite Folders ({favoriteFolders.length})</span>
                </h2>
              </div>

              {favoriteFolders.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No folders starred yet. Click the three-dots menu on any folder and select "Add to favorites".
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                  {favoriteFolders.map((f) => (
                    <FolderCard
                      key={f._id}
                      folder={f}
                      showLocation={true}
                      onFolderUpdated={fetchFavorites}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: FAVORITE DOCUMENTS */}
          {(activeTab === 'all' || activeTab === 'documents') && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#4361ee]" />
                  <span>Favorite Documents ({favoriteFiles.length})</span>
                </h2>
              </div>

              {favoriteFiles.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No documents starred yet. Click the star icon next to any document to feature it here.
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[620px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                          <th className="py-3 px-5">Name</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Size</th>
                          <th className="py-3 px-4">Uploaded</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {favoriteFiles.map((doc) => {
                          const isDownloading = downloadingId === doc._id;
                          const hasAncestors = doc.ancestors && doc.ancestors.length > 0;

                          return (
                            <tr key={doc._id} className="hover:bg-slate-50/70 transition-colors">
                              {/* Name */}
                              <td className="py-3.5 px-5">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-[#4361ee]">
                                    {doc.category === 'Spreadsheet' ? (
                                      <FileSpreadsheet className="w-4 h-4" />
                                    ) : (
                                      <FileText className="w-4 h-4" />
                                    )}
                                  </div>
                                  <span className="font-semibold text-slate-800 truncate max-w-[160px] sm:max-w-xs" title={doc.name}>
                                    {doc.name}
                                  </span>
                                </div>
                              </td>

                              {/* Interactive Location Breadcrumbs */}
                              <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                {hasAncestors ? (
                                  <div className="flex items-center space-x-1">
                                    <FolderIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <div className="flex items-center space-x-1 truncate max-w-[200px]">
                                      {doc.ancestors.map((anc, idx) => (
                                        <React.Fragment key={anc._id || idx}>
                                          <button
                                            onClick={() => navigate(`/folders/${encodeURIComponent(anc._id)}`)}
                                            className="hover:text-[#4361ee] hover:underline font-medium truncate max-w-[90px] cursor-pointer"
                                            title={anc.name}
                                          >
                                            {anc.name}
                                          </button>
                                          {idx < doc.ancestors.length - 1 && (
                                            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                                          )}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => navigate('/my-files')}
                                    className="flex items-center space-x-1.5 text-slate-500 hover:text-[#4361ee] font-medium cursor-pointer"
                                    title="Located in root My Files"
                                  >
                                    <FolderIcon className="w-3.5 h-3.5 text-slate-400" />
                                    <span>My Files</span>
                                  </button>
                                )}
                              </td>

                              {/* Size */}
                              <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                                {formatSize(doc.fileSize)}
                              </td>

                              {/* Uploaded Date */}
                              <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                                {formatDate(doc.createdAt)}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-1">
                                  {/* Unfavorite Button */}
                                  <button
                                    onClick={() => handleUnfavoriteDoc(doc._id, doc.name)}
                                    title="Remove from favorites"
                                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                                  </button>

                                  {/* Download Button */}
                                  <button
                                    onClick={() => handleDownloadDoc(doc)}
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

                                  {/* Share Button */}
                                  <button
                                    onClick={() => setSharingItem({ item: doc, type: 'document' })}
                                    title="Share Document Link"
                                    className="p-1.5 text-slate-400 hover:text-[#4361ee] rounded-lg hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
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
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      {sharingItem && (
        <ShareModal
          isOpen={!!sharingItem}
          onClose={() => setSharingItem(null)}
          item={sharingItem.item}
          type={sharingItem.type}
        />
      )}
    </main>
  );
}
