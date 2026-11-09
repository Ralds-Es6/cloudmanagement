import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Folder,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  Download,
  Trash2,
  Star,
  Plus,
  ArrowLeft,
  Loader2,
  UploadCloud,
  MoreVertical,
  Edit2,
  Archive,
  ChevronRight,
  AlertTriangle,
  X,
  Check,
  Share2,
  Pin,
  PinOff,
} from 'lucide-react';
import {
  getFolderById,
  getFolders,
  getDocuments,
  downloadDocument,
  toggleFavorite,
  moveToTrash,
  renameFolder,
  deleteFolder,
  downloadFolderZip,
  togglePinDocument,
  togglePinFolder,
  toggleFavoriteFolder,
} from '../services/api';
import FolderCard from '../components/FolderCard';
import ShareModal from '../components/ShareModal';
import { toast } from 'sonner';

function FolderSVG({ className = "w-11 h-9" }) {
  return (
    <svg
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.33333 4.66667C3.33333 2.82572 4.82572 1.33333 6.66667 1.33333H14.1953C15.0793 1.33333 15.9272 1.68452 16.5523 2.30964L19.0239 4.78122C19.649 5.40634 20.4969 5.75753 21.3809 5.75753H33.3333C35.1743 5.75753 36.6667 7.24992 36.6667 9.09086V25.3333C36.6667 27.1743 35.1743 28.6667 33.3333 28.6667H6.66667C4.82572 28.6667 3.33333 27.1743 3.33333 25.3333V4.66667Z"
        fill="#4361ee"
      />
      <path
        d="M3.33333 10.6667H36.6667V25.3333C36.6667 27.1743 35.1743 28.6667 33.3333 28.6667H6.66667C4.82572 28.6667 3.33333 27.1743 3.33333 25.3333V10.6667Z"
        fill="#5a78ff"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export default function FolderDetailPage() {
  const { folderName: folderIdentifier } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const decodedIdOrName = decodeURIComponent(folderIdentifier || '');

  const [folder, setFolder] = useState(null);
  const [subfolders, setSubfolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [ancestors, setAncestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isZipping, setIsZipping] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  // Modals state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState(null);
  const [renameLoading, setRenameLoading] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState('cascade');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [isShareFolderOpen, setIsShareFolderOpen] = useState(false);
  const [sharingDoc, setSharingDoc] = useState(null);

  const fetchFolderData = async () => {
    try {
      setLoading(true);
      // 1. Fetch current folder details & ancestors
      const folderRes = await getFolderById(decodedIdOrName);
      if (folderRes.data) {
        const currentFolder = folderRes.data;
        setFolder(currentFolder);
        setAncestors(currentFolder.ancestors || []);
        setNewName(currentFolder.name);
        context?.setActiveFolderTitle && context.setActiveFolderTitle(currentFolder.name);

        // 2. Fetch subfolders (parentId = currentFolder._id)
        const subfoldersRes = await getFolders({ parentId: currentFolder._id });
        setSubfolders(subfoldersRes.data || []);

        // 3. Fetch documents inside this folder
        const docsRes = await getDocuments({
          folderId: currentFolder._id,
          isDeleted: false,
        });
        setFiles(docsRes.data || []);
      }
    } catch (err) {
      console.warn('Could not fetch folder data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderData();
    const handleRefresh = () => fetchFolderData();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => {
      window.removeEventListener('document-uploaded', handleRefresh);
      context?.setActiveFolderTitle && context.setActiveFolderTitle('');
    };
  }, [decodedIdOrName]);

  // Handle Download file
  const handleDownload = async (file) => {
    try {
      setDownloadingId(file._id);
      toast.info(`Downloading "${file.originalName || file.name}"...`);
      await downloadDocument(file._id, file.originalName || file.name);
    } catch (err) {
      toast.error(`Download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle Toggle Favorite
  const handleToggleFavorite = async (id) => {
    try {
      await toggleFavorite(id);
      setFiles((prev) =>
        prev.map((d) => {
          if (d._id === id) {
            const nextFav = !d.isFavorite;
            toast.success(nextFav ? 'Added to favorites' : 'Removed from favorites');
            return { ...d, isFavorite: nextFav };
          }
          return d;
        })
      );
    } catch (err) {
      toast.error('Failed to update favorite');
    }
  };

  const handleToggleFolderFavorite = async () => {
    try {
      setIsMenuOpen(false);
      const res = await toggleFavoriteFolder(folder._id);
      setFolder((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
      toast.success(
        res.message ||
          (res.data?.isFavorite ? 'Folder added to favorites' : 'Folder removed from favorites')
      );
      window.dispatchEvent(new Event('document-uploaded'));
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update favorite');
    }
  };

  const handleToggleFolderPin = async () => {
    try {
      setIsMenuOpen(false);
      const res = await togglePinFolder(folder._id);
      setFolder((prev) => ({ ...prev, isPinned: !prev.isPinned }));
      toast.success(res.message || (res.data?.isPinned ? 'Folder pinned to top' : 'Folder unpinned'));
      window.dispatchEvent(new Event('document-uploaded'));
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update pin');
    }
  };

  // Handle Delete file
  const handleDeleteFile = async (id) => {
    if (!confirm('Move this document to trash?')) return;
    try {
      await moveToTrash(id);
      setFiles((prev) => prev.filter((d) => d._id !== id));
      toast.success('Document moved to trash');
      window.dispatchEvent(new Event('document-uploaded'));
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  // Handle Toggle Pin Document
  const handleTogglePinDoc = async (id) => {
    try {
      const res = await togglePinDocument(id);
      toast.success(res.message || 'Updated pin');
      fetchFolderData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to pin document');
    }
  };

  // Handle Rename Folder (with Sibling Uniqueness)
  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === folder?.name) {
      setIsRenameOpen(false);
      return;
    }

    try {
      setRenameLoading(true);
      setRenameError(null);
      await renameFolder(folder._id, newName.trim());
      setIsRenameOpen(false);
      toast.success(`Folder renamed to "${newName.trim()}"`);
      window.dispatchEvent(new Event('document-uploaded'));
      navigate(`/folders/${encodeURIComponent(folder._id)}`, { replace: true });
      fetchFolderData();
    } catch (err) {
      setRenameError(err.response?.data?.message || err.message);
    } finally {
      setRenameLoading(false);
    }
  };

  // Handle Delete Folder
  const handleDeleteFolderSubmit = async () => {
    try {
      setDeleteLoading(true);
      await deleteFolder(folder._id, deleteMode);
      setIsDeleteOpen(false);
      toast.success(`Folder "${folder.name}" deleted`);
      window.dispatchEvent(new Event('document-uploaded'));
      // Navigate to parent or all-files
      if (ancestors.length > 0) {
        const parent = ancestors[ancestors.length - 1];
        navigate(`/folders/${encodeURIComponent(parent._id)}`);
      } else {
        navigate('/all-files');
      }
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Download Folder as ZIP
  const handleDownloadZip = async () => {
    if (!folder) return;
    try {
      setIsZipping(true);
      setIsMenuOpen(false);
      toast.info(`Preparing ZIP archive for "${folder.name}"...`);
      await downloadFolderZip(folder._id, folder.name);
      toast.success(`ZIP downloaded for "${folder.name}"`);
    } catch (err) {
      toast.error(`ZIP Download failed: ${err.message}`);
    } finally {
      setIsZipping(false);
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

  const getFileIcon = (category) => {
    if (category === 'Spreadsheet') return FileSpreadsheet;
    return FileText;
  };

  const filteredFiles = files.filter((f) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Documents') return f.category === 'Document';
    if (activeCategory === 'Spreadsheets') return f.category === 'Spreadsheet';
    if (activeCategory === 'Presentations') return f.category === 'Presentation';
    if (activeCategory === 'Text') return f.category === 'Text';
    return true;
  });

  const categoryFilters = [
    { label: 'All', count: files.length },
    { label: 'Documents', count: files.filter((f) => f.category === 'Document').length },
    { label: 'Spreadsheets', count: files.filter((f) => f.category === 'Spreadsheet').length },
    { label: 'Presentations', count: files.filter((f) => f.category === 'Presentation').length },
    { label: 'Text', count: files.filter((f) => f.category === 'Text').length },
  ];

  if (loading) {
    return (
      <main className="px-6 sm:px-10 lg:px-12 py-16 flex items-center justify-center space-x-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-[#4361ee]" />
        <span className="text-sm font-medium">Loading folder contents...</span>
      </main>
    );
  }

  if (!folder) {
    return (
      <main className="px-6 sm:px-10 lg:px-12 py-16 text-center space-y-4">
        <Folder className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Folder not found</h2>
        <p className="text-xs text-slate-400">
          The requested folder does not exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/all-files')}
          className="px-4 py-2 bg-[#4361ee] text-white text-xs font-semibold rounded-xl cursor-pointer"
        >
          Back to All Files
        </button>
      </main>
    );
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full space-y-5 sm:space-y-6">
      {/* Dynamic Hierarchy Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs sm:text-sm overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span className="text-slate-300">|</span>
        <button
          onClick={() => navigate('/all-files')}
          className="text-slate-400 hover:text-[#4361ee] font-medium transition-colors shrink-0 cursor-pointer"
        >
          All Files
        </button>

        {ancestors.map((anc) => (
          <React.Fragment key={anc._id}>
            <span className="text-slate-300 shrink-0">›</span>
            <button
              onClick={() => navigate(`/folders/${encodeURIComponent(anc._id)}`)}
              className="text-slate-400 hover:text-[#4361ee] font-medium transition-colors truncate max-w-[140px] cursor-pointer"
            >
              {anc.name}
            </button>
          </React.Fragment>
        ))}

        <span className="text-slate-300 shrink-0">›</span>
        <span className="text-slate-900 font-bold truncate max-w-[200px] shrink-0">
          {folder.name}
        </span>
      </div>

      {/* Hero Folder Banner */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)] relative">
        <div className="flex items-start sm:items-center space-x-4 sm:space-x-5 min-w-0">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/95 border border-indigo-100/80 flex items-center justify-center text-[#4361ee] shadow-sm shrink-0">
            <Folder className="w-7 h-7 sm:w-10 sm:h-10 stroke-[1.8] fill-[#4361ee]/10" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {folder.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#e0e7ff] text-[#4361ee]">
                {ancestors.length > 0 ? 'Subfolder' : 'Root Folder'}
              </span>
              {folder.isFavorite && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                  <span>Favorite</span>
                </span>
              )}
              {folder.isPinned && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-[#4361ee] border border-blue-100 flex items-center gap-1">
                  <Pin className="w-3 h-3 fill-[#4361ee]/20" />
                  <span>Pinned</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2.5 text-xs text-slate-400 font-medium">
              <span>{subfolders.length} {subfolders.length === 1 ? 'subfolder' : 'subfolders'}</span>
              <span>·</span>
              <span>{files.length} {files.length === 1 ? 'document' : 'documents'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {/* Add Subfolder */}
          <button
            onClick={() =>
              context?.openCreate &&
              context.openCreate({
                defaultFolder: folder.name,
                parentId: folder._id,
                initialTab: 'folder',
              })
            }
            className="bg-white border border-slate-200 hover:border-[#4361ee]/40 text-slate-700 hover:text-[#4361ee] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-2xs transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-[#4361ee]" />
            <span>+ Sub Folder</span>
          </button>

          {/* Upload Document */}
          <button
            onClick={() =>
              context?.openCreate &&
              context.openCreate({
                defaultFolder: folder.name,
                parentId: folder._id,
                initialTab: 'upload',
              })
            }
            className="bg-[#4361ee] hover:bg-[#3652db] text-white text-xs sm:text-sm font-semibold px-4.5 py-2.5 rounded-xl flex items-center space-x-2 shadow-md shadow-blue-900/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
            <span>Upload Document</span>
          </button>

          {/* Folder Context Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Folder options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {/* Favorite Toggle */}
                <button
                  onClick={handleToggleFolderFavorite}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      folder?.isFavorite
                        ? 'fill-amber-400 stroke-amber-500 text-amber-500'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{folder?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</span>
                </button>

                {/* Pin Toggle */}
                <button
                  onClick={handleToggleFolderPin}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  {folder?.isPinned ? (
                    <>
                      <PinOff className="w-3.5 h-3.5 text-slate-400" />
                      <span>Unpin from top</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-3.5 h-3.5 text-[#4361ee]" />
                      <span>Pin folder to top</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsShareFolderOpen(true)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#4361ee]" />
                  <span>Share folder link</span>
                </button>

                <button
                  onClick={() => {
                    setRenameError(null);
                    setNewName(folder.name);
                    setIsRenameOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rename folder</span>
                </button>

                <button
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  {isZipping ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4361ee]" />
                  ) : (
                    <Archive className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{isZipping ? 'Archiving ZIP...' : 'Download as .ZIP'}</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => setIsDeleteOpen(true)}
                  className="w-full text-left px-4 py-2.5 hover:bg-rose-50 flex items-center space-x-2.5 text-rose-600 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete folder</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty Folder State (Both 0 subfolders and 0 documents) */}
      {subfolders.length === 0 && files.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-14 text-center max-w-md mx-auto shadow-xs my-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#4361ee] flex items-center justify-center mx-auto mb-3.5">
            <Folder className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">This folder is empty</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Use the buttons in the top right to upload documents or create a subfolder inside "{folder.name}".
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {/* Subfolders Grid (only rendered if subfolders actually exist) */}
          {subfolders.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>Subfolders</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                    {subfolders.length}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4.5">
                {subfolders.map((sub) => (
                  <FolderCard
                    key={sub._id}
                    folder={sub}
                    onFolderUpdated={fetchFolderData}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Documents Section (only rendered if files exist) */}
          {files.length > 0 && (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>Documents</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                    {filteredFiles.length}
                  </span>
                </h2>

                {/* Category Filter Pills (Inside Folder View) */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {categoryFilters.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setActiveCategory(f.label)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeCategory === f.label
                          ? 'bg-[#4361ee] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {f.label} <span className="opacity-70 ml-0.5">({f.count})</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file.category);
                  const isDownloading = downloadingId === file._id;

                  return (
                    <tr
                      key={file._id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleToggleFavorite(file._id)}
                            className="text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                file.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                              }`}
                            />
                          </button>
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#4361ee] flex items-center justify-center shrink-0 relative">
                            <Icon className="w-4 h-4" />
                            {file.isPinned && (
                              <span
                                className="absolute -top-1 -right-1 p-0.5 bg-blue-600 text-white rounded-full shadow-xs"
                                title="Pinned to top"
                              >
                                <Pin className="w-2.5 h-2.5 fill-white" />
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-slate-800 group-hover:text-[#4361ee] transition-colors truncate max-w-xs sm:max-w-md">
                            {file.originalName || file.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {formatSize(file.fileSize)}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {file.ownerName || file.owner || file.author || 'Administrator'}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {formatDate(file.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleTogglePinDoc(file._id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#4361ee] transition-colors cursor-pointer"
                            title={file.isPinned ? 'Unpin from top' : 'Pin to top'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${file.isPinned ? 'text-[#4361ee] fill-[#4361ee]/20' : ''}`} />
                          </button>

                          <button
                            onClick={() => handleDownload(file)}
                            disabled={isDownloading}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#4361ee] transition-colors cursor-pointer"
                            title="Download document"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#4361ee]" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => setSharingDoc(file)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#4361ee] transition-colors cursor-pointer"
                            title="Share document link"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteFile(file._id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Move to trash"
                          >
                            <Trash2 className="w-4 h-4" />
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
        </section>
      )}
    </div>
  )}

      {/* RENAME FOLDER MODAL */}
      {isRenameOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Rename Folder</h3>
              <button
                onClick={() => setIsRenameOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Legal Documents"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee]"
                />
              </div>

              {renameError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{renameError}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenameOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameLoading}
                  className="px-4 py-2 rounded-xl bg-[#4361ee] hover:bg-[#3652db] text-xs font-semibold text-white shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {renameLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE FOLDER MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Delete Folder</h3>
              </div>
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              How would you like to handle files and subfolders inside <strong className="text-slate-800">"{folder.name}"</strong>?
            </p>

            <div className="mt-4 space-y-2.5">
              <label
                onClick={() => setDeleteMode('cascade')}
                className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  deleteMode === 'cascade'
                    ? 'border-rose-400 bg-rose-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'cascade'}
                  onChange={() => setDeleteMode('cascade')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Move everything to trash</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Moves this folder, all subfolders, and all {files.length} documents into the trash bin.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setDeleteMode('unlink')}
                className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  deleteMode === 'unlink'
                    ? 'border-[#4361ee] bg-indigo-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'unlink'}
                  onChange={() => setDeleteMode('unlink')}
                  className="mt-1 text-[#4361ee] focus:ring-[#4361ee]"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Keep files (Unlink folder)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Deletes the folder but safely preserves all documents and subfolders by moving them up one level.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-5">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFolderSubmit}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modals */}
      {isShareFolderOpen && folder && (
        <ShareModal
          isOpen={isShareFolderOpen}
          onClose={() => setIsShareFolderOpen(false)}
          item={folder}
          type="folder"
          onUpdated={fetchFolderData}
        />
      )}

      {sharingDoc && (
        <ShareModal
          isOpen={!!sharingDoc}
          onClose={() => setSharingDoc(null)}
          item={sharingDoc}
          type="document"
          onUpdated={fetchFolderData}
        />
      )}
    </main>
  );
}
