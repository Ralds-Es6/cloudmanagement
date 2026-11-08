import React, { useState, useEffect } from 'react';
import {
  Link2,
  Copy,
  Check,
  Globe,
  Lock,
  Shield,
  X,
  Loader2,
  AlertCircle,
  Folder,
  FileText,
} from 'lucide-react';
import {
  generateFolderShareLink,
  disableFolderShareLink,
  generateDocumentShareLink,
  disableDocumentShareLink,
} from '../services/api';
import { toast } from 'sonner';

export default function ShareModal({ isOpen, onClose, item, type = 'folder', onUpdated }) {
  const [permission, setPermission] = useState('viewer');
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setShareData(item.shareLink || null);
      setPermission(item.shareLink?.permission || 'viewer');
      setError('');
      setCopied(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const itemName = item.originalName || item.name || 'Item';
  const isEnabled = shareData?.enabled && shareData?.token;
  const shareUrl = isEnabled
    ? `${window.location.origin}/shared-link/${shareData.token}`
    : '';

  const handleActivateOrUpdate = async (newPerm = permission) => {
    try {
      setLoading(true);
      setError('');
      let res;
      if (type === 'folder') {
        res = await generateFolderShareLink(item._id, newPerm);
      } else {
        res = await generateDocumentShareLink(item._id, newPerm);
      }
      if (res.data) {
        setShareData(res.data);
        if (onUpdated) onUpdated();
        toast.success(newPerm === 'editor' ? 'Share link updated (Edit access)' : 'Public share link activated');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update share link');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableLink = async () => {
    if (!confirm('Disable this share link? Anyone with the link will immediately lose access.')) return;
    try {
      setLoading(true);
      setError('');
      if (type === 'folder') {
        await disableFolderShareLink(item._id);
      } else {
        await disableDocumentShareLink(item._id);
      }
      setShareData({ enabled: false, token: null });
      if (onUpdated) onUpdated();
      toast.info('Share link disabled');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to disable share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Share link copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#4361ee] flex items-center justify-center shrink-0">
            {type === 'folder' ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div className="min-w-0 pr-6">
            <h3 className="text-base font-bold text-slate-900 truncate">{itemName}</h3>
            <p className="text-xs text-slate-400">Shareable Link Access Control</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Share Status Section */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isEnabled ? (
                  <Globe className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs font-bold text-slate-800">
                  {isEnabled ? 'Link Sharing is Active' : 'Restricted (Private Only)'}
                </span>
              </div>

              {/* Permission Selector */}
              {isEnabled && (
                <select
                  value={permission}
                  onChange={(e) => {
                    const newPerm = e.target.value;
                    setPermission(newPerm);
                    handleActivateOrUpdate(newPerm);
                  }}
                  disabled={loading}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 cursor-pointer"
                >
                  <option value="viewer">Can View (Read-Only)</option>
                  <option value="editor">Can Edit (Collaborate)</option>
                </select>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {isEnabled
                ? type === 'folder'
                  ? 'Anyone with this link can access this folder and its contents. Higher parent directories are strictly sealed and hidden.'
                  : 'Anyone with this link can view and download this document. Parent folders are completely hidden.'
                : 'Only you (and the system admin) can access this item. Enable link sharing below to collaborate.'}
            </p>
          </div>

          {/* Link Box (when enabled) */}
          {isEnabled ? (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Shareable URL
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[#4361ee] hover:bg-[#3652db] text-white shadow-sm'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={handleDisableLink}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                >
                  Disable Link
                </button>
                <span className="text-slate-400 text-[11px]">Subtree lockdown enforced</span>
              </div>
            </div>
          ) : (
            /* Enable button */
            <button
              type="button"
              onClick={() => handleActivateOrUpdate('viewer')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#4361ee] hover:bg-[#3652db] disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md shadow-[#4361ee]/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span>Create Shareable Link</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

