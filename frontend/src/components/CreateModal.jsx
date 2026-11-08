import React, { useState, useEffect } from 'react';
import {
  X,
  FolderPlus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { uploadDocument, createFolder, getFolders } from '../services/api';
import { toast } from 'sonner';

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.md',
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export default function CreateModal({
  isOpen,
  onClose,
  onCreated,
  defaultFolder = 'Team Folder',
  parentId = null,
  initialTab = 'upload',
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'upload');
  const [folderName, setFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetFolder, setTargetFolder] = useState(defaultFolder || 'Team Folder');
  const [availableFolders, setAvailableFolders] = useState(['Team Folder']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (defaultFolder) {
        setTargetFolder(defaultFolder);
      }
      if (initialTab) {
        setActiveTab(initialTab);
      }
      loadFolders();
    }
  }, [isOpen, defaultFolder, initialTab]);

  const loadFolders = async () => {
    try {
      const res = await getFolders({ all: 'true' });
      if (res.data && res.data.length > 0) {
        const names = Array.from(
          new Set(['Team Folder', ...res.data.map((f) => f.name)])
        );
        setAvailableFolders(names);
      }
    } catch (err) {
      console.warn('Could not load folders for dropdown:', err.message);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setError(null);
    const file = e.target.files[0];
    if (!file) return;

    // 1. Prohibit Video and Audio/Music
    const mime = (file.type || '').toLowerCase();
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (
      mime.startsWith('video/') ||
      mime.startsWith('audio/') ||
      ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.mp3', '.wav', '.flac', '.aac'].includes(ext)
    ) {
      setError('Media files (videos, music, and audio) are prohibited. Only document files are allowed.');
      setSelectedFile(null);
      return;
    }

    // 2. Restrict to Document File Types
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(
        `Restricted file type. Only document files are allowed (${ALLOWED_EXTENSIONS.join(', ')}).`
      );
      setSelectedFile(null);
      return;
    }

    // 3. 10MB Size Limit
    if (file.size > MAX_SIZE_BYTES) {
      setError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB per file.`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFolderSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await createFolder({
        name: folderName.trim(),
        parentId: parentId || null,
      });
      setSuccess(true);
      toast.success(`Folder "${folderName.trim()}" created successfully`);
      setTimeout(() => {
        setSuccess(false);
        setFolderName('');
        if (onCreated) onCreated();
        onClose();
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a document file first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', targetFolder);
      if (parentId) {
        formData.append('folderId', parentId);
      }

      await uploadDocument(formData);
      setSuccess(true);
      toast.success(`Document "${selectedFile.name}" uploaded successfully`);
      setTimeout(() => {
        setSuccess(false);
        setSelectedFile(null);
        if (onCreated) onCreated();
        onClose();
      }, 700);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Upload failed. Please check server connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">
            Document Management
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-2 gap-2 my-5 p-1 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('upload');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-[#4361ee]" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('folder');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'folder'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-[#4361ee]" />
            <span>{parentId ? 'Sub Folder' : 'New Folder'}</span>
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-slate-900 text-sm">
              {activeTab === 'upload'
                ? 'Document Uploaded!'
                : (parentId ? 'Sub Folder Created!' : 'Folder Created!')}
            </h4>
            <p className="text-xs text-slate-400">Synced to your database and storage.</p>
          </div>
        ) : activeTab === 'folder' ? (
          <form onSubmit={handleFolderSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {parentId ? 'Sub Folder Name' : 'Folder Name'}
              </label>
              <input
                type="text"
                required
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={parentId ? 'e.g. 2026 Reports' : 'e.g. Legal & Contracts'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee]"
              />
            </div>
            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#4361ee] hover:bg-[#3652db] shadow-md shadow-blue-900/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{parentId ? 'Create Sub Folder' : 'Create Folder'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Folder
                </label>
                <select
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee]"
                >
                  {availableFolders.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Drop Box */}
              <label className="border-2 border-dashed border-indigo-200/90 hover:border-[#4361ee] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 block group">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="space-y-1">
                    <FileText className="w-8 h-8 text-[#4361ee] mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready to upload
                    </p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-9 h-9 text-[#4361ee] mx-auto mb-2 group-hover:scale-105 transition-transform" />
                    <p className="text-xs font-semibold text-slate-700">
                      Click to browse a document
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Allowed: PDF, DOCX, DOC, XLSX, XLS, PPTX, TXT, CSV, MD
                    </p>
                    <p className="text-[10px] text-indigo-500 font-semibold mt-1">
                      Max file size: 10MB · No videos or music
                    </p>
                  </>
                )}
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#4361ee] hover:bg-[#3652db] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Upload Document</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
