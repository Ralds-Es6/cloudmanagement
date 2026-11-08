import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  Edit2,
  Archive,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  ArrowRight,
  Share2,
  Pin,
  PinOff,
  Star,
  Folder as FolderIcon,
} from 'lucide-react';
import {
  renameFolder,
  deleteFolder,
  downloadFolderZip,
  togglePinFolder,
  toggleFavoriteFolder,
} from '../services/api';
import ShareModal from './ShareModal';
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

export default function FolderCard({ folder, onFolderUpdated, showLocation = false, className = "" }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const [newName, setNewName] = useState(folder.name);
  const [renameError, setRenameError] = useState(null);
  const [renameLoading, setRenameLoading] = useState(false);

  const [deleteMode, setDeleteMode] = useState('cascade');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [isZipping, setIsZipping] = useState(false);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleCardClick = () => {
    navigate(`/folders/${encodeURIComponent(folder._id || folder.name)}`);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === folder.name) {
      setIsRenameOpen(false);
      return;
    }

    try {
      setRenameLoading(true);
      setRenameError(null);
      await renameFolder(folder._id, newName.trim());
      setIsRenameOpen(false);
      window.dispatchEvent(new Event('document-uploaded'));
      toast.success(`Folder renamed to "${newName.trim()}"`);
      if (onFolderUpdated) onFolderUpdated();
    } catch (err) {
      setRenameError(err.response?.data?.message || err.message);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      setDeleteLoading(true);
      await deleteFolder(folder._id, deleteMode);
      setIsDeleteOpen(false);
      window.dispatchEvent(new Event('document-uploaded'));
      toast.success(`Folder "${folder.name}" deleted`);
      if (onFolderUpdated) onFolderUpdated();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      setIsMenuOpen(false);
      toast.info(`Preparing ZIP for "${folder.name}"...`);
      await downloadFolderZip(folder._id, folder.name);
      toast.success(`ZIP downloaded for "${folder.name}"`);
    } catch (err) {
      toast.error(`ZIP Download failed: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  const handleTogglePin = async (e) => {
    if (e) e.stopPropagation();
    try {
      setIsMenuOpen(false);
      const res = await togglePinFolder(folder._id);
      toast.success(res.message || (res.data?.isPinned ? 'Folder pinned to top' : 'Folder unpinned'));
      window.dispatchEvent(new Event('document-uploaded'));
      if (onFolderUpdated) onFolderUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update pin');
    }
  };

  const handleToggleFavorite = async (e) => {
    if (e) e.stopPropagation();
    try {
      setIsMenuOpen(false);
      const res = await toggleFavoriteFolder(folder._id);
      toast.success(
        res.message ||
          (res.data?.isFavorite ? 'Folder added to favorites' : 'Folder removed from favorites')
      );
      window.dispatchEvent(new Event('document-uploaded'));
      if (onFolderUpdated) onFolderUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update favorite');
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_20px_rgba(67,97,238,0.08)] hover:border-[#4361ee]/40 transition-all cursor-pointer group relative min-w-0 ${className}`}
      >
        <div className="flex items-start justify-between mb-4">
          <FolderSVG className="w-11 h-9 sm:w-12 sm:h-10 group-hover:scale-105 transition-transform" />

          {/* Right Controls: Star Badge + Pin Badge + 3 Dots Menu Button */}
          <div className="flex items-center space-x-1" ref={menuRef}>
            {folder.isFavorite && (
              <span
                className="p-1 rounded-lg bg-amber-50 text-amber-500 border border-amber-100 shadow-2xs"
                title="Starred folder"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
              </span>
            )}

            {folder.isPinned && (
              <span
                className="p-1 rounded-lg bg-blue-50 text-[#4361ee] border border-blue-100 shadow-2xs"
                title="Pinned to top"
              >
                <Pin className="w-3.5 h-3.5 fill-[#4361ee]/20" />
              </span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Folder options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Context Dropdown Menu */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                {/* Favorite / Unfavorite Action */}
                <button
                  onClick={handleToggleFavorite}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      folder.isFavorite ? 'fill-amber-400 stroke-amber-500 text-amber-500' : 'text-slate-400'
                    }`}
                  />
                  <span>{folder.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</span>
                </button>

                {/* Pin / Unpin Action */}
                <button
                  onClick={handleTogglePin}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  {folder.isPinned ? (
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
                  onClick={() => {
                    setIsShareOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#4361ee]" />
                  <span>Share link access</span>
                </button>

                <button
                  onClick={() => {
                    setRenameError(null);
                    setNewName(folder.name);
                    setIsRenameOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rename folder</span>
                </button>

                <button
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 font-medium cursor-pointer disabled:opacity-50"
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
                  onClick={() => {
                    setIsDeleteOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-rose-50 flex items-center space-x-2.5 text-rose-600 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete folder</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1 group-hover:text-[#4361ee] transition-colors flex items-center justify-between">
          <span className="truncate pr-2">{folder.name}</span>
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[#4361ee] shrink-0" />
        </h3>

        <p className="text-xs text-slate-400">
          {folder.filesCount || 0} files · {folder.subfoldersCount || 0} subfolders
        </p>

        {/* Ancestor Location Breadcrumb */}
        {folder.ancestors && folder.ancestors.length > 0 ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              const parent = folder.ancestors[folder.ancestors.length - 1];
              navigate(`/folders/${encodeURIComponent(parent._id)}`);
            }}
            className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-[#4361ee] transition-colors group/loc"
            title={`Located in: My Files / ${folder.ancestors.map((a) => a.name).join(' / ')}`}
          >
            <FolderIcon className="w-3 h-3 shrink-0 text-slate-400 group-hover/loc:text-[#4361ee]" />
            <span className="truncate">
              {folder.ancestors.map((a) => a.name).join(' › ')}
            </span>
          </div>
        ) : showLocation ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate('/my-files');
            }}
            className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-[#4361ee] transition-colors group/loc"
            title="Located in: My Files (Root)"
          >
            <FolderIcon className="w-3 h-3 shrink-0 text-slate-400 group-hover/loc:text-[#4361ee]" />
            <span className="truncate font-medium">My Files</span>
          </div>
        ) : null}
      </div>

      {/* RENAME FOLDER MODAL */}
      {isRenameOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
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
                  autoFocus
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
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
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
                  name={`deleteMode-${folder._id}`}
                  checked={deleteMode === 'cascade'}
                  onChange={() => setDeleteMode('cascade')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Move everything to trash</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Moves this folder, all subfolders, and all {folder.filesCount || 0} documents into the trash bin.
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
                  name={`deleteMode-${folder._id}`}
                  checked={deleteMode === 'unlink'}
                  onChange={() => setDeleteMode('unlink')}
                  className="mt-1 text-[#4361ee] focus:ring-[#4361ee]"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Keep files (Unlink folder)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Deletes the folder container but safely preserves all documents and subfolders by moving them up one level.
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
                onClick={handleDeleteSubmit}
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

      {/* Shareable Link Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        item={folder}
        type="folder"
        onUpdated={onFolderUpdated}
      />
    </>
  );
}

