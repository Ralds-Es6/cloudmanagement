import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FolderPlus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Folder,
  FolderUp,
  FileUp,
  Loader2,
  Trash2,
} from 'lucide-react';
import { createFolder, getFolders, getUploadRulesApi } from '../services/api';
import {
  DEFAULT_ALLOWED_EXTENSIONS,
  DEFAULT_MAX_UPLOAD_SIZE_MB,
  normalizeExtensionsList,
  extractEntriesFromDataTransfer,
  extractEntriesFromFileList,
  partitionUploadItems,
  executeBatchUpload,
} from '../utils/folderUpload';
import { toast } from 'sonner';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function CreateModal({
  isOpen,
  onClose,
  onCreated,
  defaultFolder = 'Team Folder',
  parentId = null,
  initialTab = 'upload',
  initialPayload = null,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'upload');
  const [folderName, setFolderName] = useState('');

  // Multi-file & folder upload queue state
  const [validItems, setValidItems] = useState([]);
  const [skippedItems, setSkippedItems] = useState([]);
  const [folderPaths, setFolderPaths] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Live admin upload rules (allowedExtensions & maxUploadSizeMB)
  const [uploadRules, setUploadRules] = useState({
    allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS,
    maxUploadSizeMB: DEFAULT_MAX_UPLOAD_SIZE_MB,
  });

  // Target folder state (tracks real _id when available, '' for root)
  const [targetFolderId, setTargetFolderId] = useState(parentId || '');
  const [availableFolders, setAvailableFolders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setError(null);
    setSuccessInfo(null);
    setUploadProgress(null);
    setIsDragging(false);
    dragDepthRef.current = 0;

    if (initialTab) {
      setActiveTab(initialTab);
    }
    setTargetFolderId(parentId || '');

    const initModalData = async () => {
      let activeRules = {
        allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS,
        maxUploadSizeMB: DEFAULT_MAX_UPLOAD_SIZE_MB,
      };

      try {
        const rulesRes = await getUploadRulesApi();
        if (!cancelled && rulesRes?.data) {
          activeRules = {
            allowedExtensions: normalizeExtensionsList(rulesRes.data.allowedExtensions),
            maxUploadSizeMB:
              Number(rulesRes.data.maxUploadSizeMB) || DEFAULT_MAX_UPLOAD_SIZE_MB,
          };
          setUploadRules(activeRules);
        }
      } catch (err) {
        console.warn('Could not fetch live upload rules:', err.message);
      }

      if (cancelled) return;

      if (initialPayload && (initialPayload.items?.length || initialPayload.folders?.length)) {
        const { valid, skipped } = partitionUploadItems(initialPayload.items || [], activeRules);
        setValidItems(valid);
        setSkippedItems(skipped);
        setFolderPaths(initialPayload.folders || []);
        if (valid.length === 0 && (!initialPayload.folders || initialPayload.folders.length === 0) && skipped.length > 0) {
          setError(skipped[0].reason || 'No valid files matched administrator upload policy.');
        }
      } else {
        setValidItems([]);
        setSkippedItems([]);
        setFolderPaths([]);
      }
    };

    initModalData();
    loadFolders(parentId, defaultFolder);

    return () => {
      cancelled = true;
    };
  }, [isOpen, defaultFolder, parentId, initialTab, initialPayload]);

  const loadFolders = async (activeParentId, fallbackFolderName) => {
    try {
      const res = await getFolders({ all: 'true' });
      const list = Array.isArray(res?.data) ? res.data : [];
      setAvailableFolders(list);

      if (!activeParentId && fallbackFolderName && fallbackFolderName !== 'Team Folder') {
        const matched = list.find((f) => f.name === fallbackFolderName);
        if (matched?._id) {
          setTargetFolderId(matched._id);
        }
      }
    } catch (err) {
      console.warn('Could not load folders for dropdown:', err.message);
    }
  };

  if (!isOpen) return null;

  const mergeExtractedEntries = ({ items, folders }) => {
    setError(null);
    const { valid, skipped } = partitionUploadItems(items || [], uploadRules);

    setValidItems((prev) => {
      const existingKeys = new Set(prev.map((x) => `${x.relativePath}::${x.file.size}`));
      const next = [...prev];
      for (const item of valid) {
        const key = `${item.relativePath}::${item.file.size}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          next.push(item);
        }
      }
      return next;
    });

    if (skipped.length > 0) {
      setSkippedItems((prev) => {
        const existingKeys = new Set(prev.map((x) => `${x.relativePath}::${x.file.size}`));
        const next = [...prev];
        for (const item of skipped) {
          const key = `${item.relativePath}::${item.file.size}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            next.push(item);
          }
        }
        return next;
      });
    }

    if (folders && folders.length > 0) {
      setFolderPaths((prev) => Array.from(new Set([...prev, ...folders])));
    }

    // If single disallowed file was dropped/selected with no folders, surface a clear inline error too
    if (valid.length === 0 && (!folders || folders.length === 0) && skipped.length > 0) {
      setError(skipped[0].reason || 'No valid document files were selected.');
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const extracted = extractEntriesFromFileList(files);
    mergeExtractedEntries(extracted);
    e.target.value = '';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (loading) return;

    try {
      setIsScanning(true);
      setError(null);
      const extracted = await extractEntriesFromDataTransfer(e.dataTransfer);
      if (extracted.items.length === 0 && extracted.folders.length === 0) {
        setError('Could not read any files or folders from the drop.');
        return;
      }
      mergeExtractedEntries(extracted);
    } catch (err) {
      setError(err?.message || 'Failed to read dropped files or folders.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemoveQueuedFile = (relativePath) => {
    setValidItems((prev) => prev.filter((item) => item.relativePath !== relativePath));
  };

  const handleClearQueue = () => {
    setValidItems([]);
    setSkippedItems([]);
    setFolderPaths([]);
    setError(null);
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
      setSuccessInfo({
        title: parentId ? 'Sub Folder Created!' : 'Folder Created!',
        subtitle: 'Synced to your database and storage.',
      });
      toast.success(`Folder "${folderName.trim()}" created successfully`);
      setTimeout(() => {
        setSuccessInfo(null);
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
    if (validItems.length === 0 && folderPaths.length === 0) {
      setError('Please select or drop at least one document or folder.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedFolderObj = availableFolders.find((f) => f._id === targetFolderId);
      const baseParentId = targetFolderId || null;
      const baseFolderName = selectedFolderObj?.name || defaultFolder || 'Team Folder';

      const result = await executeBatchUpload({
        validItems,
        folderPaths,
        baseParentId,
        baseFolderName,
        onProgress: (prog) => setUploadProgress(prog),
      });

      const uploadedCount = result.uploadedFiles.length;
      const createdFoldersCount = result.createdFoldersCount;
      const failedCount = result.failedFiles.length;

      if (failedCount > 0 && uploadedCount === 0 && createdFoldersCount === 0) {
        setError(result.failedFiles[0]?.error || 'All uploads failed. Please try again.');
        setUploadProgress(null);
        return;
      }

      const summaryParts = [];
      if (createdFoldersCount > 0) {
        summaryParts.push(`${createdFoldersCount} folder${createdFoldersCount > 1 ? 's' : ''}`);
      }
      if (uploadedCount > 0) {
        summaryParts.push(`${uploadedCount} document${uploadedCount > 1 ? 's' : ''}`);
      }

      const summaryText = summaryParts.length > 0 ? summaryParts.join(' & ') : 'Upload complete';

      if (failedCount > 0) {
        toast.warning(`Uploaded ${summaryText} (${failedCount} failed)`);
      } else {
        toast.success(`Successfully uploaded ${summaryText}`);
      }

      setSuccessInfo({
        title: folderPaths.length > 0 ? 'Folder & Files Uploaded!' : 'Upload Complete!',
        subtitle: `Synced ${summaryText} to your cloud storage.`,
      });

      setTimeout(() => {
        setSuccessInfo(null);
        setValidItems([]);
        setSkippedItems([]);
        setFolderPaths([]);
        setUploadProgress(null);
        if (onCreated) onCreated();
        onClose();
      }, 800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Upload failed. Please check server connection.'
      );
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const totalBytes = validItems.reduce((sum, item) => sum + (item.file?.size || 0), 0);
  const hasQueuedContent = validItems.length > 0 || folderPaths.length > 0;
  const acceptAttr = uploadRules.allowedExtensions.map((e) => `.${e}`).join(',');
  const formattedAllowedLabel =
    uploadRules.allowedExtensions.length > 0
      ? uploadRules.allowedExtensions.map((e) => e.toUpperCase()).join(', ')
      : 'None (uploads disabled by admin)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-slate-900 text-base">Document Management</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-2 gap-2 my-4 p-1 bg-slate-100/80 rounded-xl shrink-0">
          <button
            type="button"
            disabled={loading}
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
            <span>Upload Files / Folder</span>
          </button>
          <button
            type="button"
            disabled={loading}
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
          <div className="mb-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-y-auto pr-0.5">
          {successInfo ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="font-bold text-slate-900 text-sm">{successInfo.title}</h4>
              <p className="text-xs text-slate-400">{successInfo.subtitle}</p>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              {/* Target Destination Folder */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination Folder
                </label>
                <select
                  value={targetFolderId}
                  disabled={loading}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee] disabled:opacity-60"
                >
                  <option value="">My Files (Root Directory)</option>
                  {availableFolders.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hidden File & Folder Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept={acceptAttr}
                onChange={handleFileInputChange}
              />
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                  isDragging
                    ? 'border-[#4361ee] bg-indigo-50/80 scale-[1.01]'
                    : 'border-indigo-200/90 hover:border-[#4361ee]/70 bg-slate-50/60'
                }`}
              >
                {isScanning ? (
                  <div className="py-4 flex flex-col items-center space-y-2">
                    <Loader2 className="w-8 h-8 text-[#4361ee] animate-spin" />
                    <p className="text-xs font-semibold text-slate-700">
                      Scanning folder structure...
                    </p>
                  </div>
                ) : (
                  <>
                    <UploadCloud
                      className={`w-8 h-8 mx-auto mb-2 transition-transform ${
                        isDragging ? 'text-[#4361ee] scale-110' : 'text-[#4361ee]'
                      }`}
                    />
                    <p className="text-xs font-semibold text-slate-800">
                      {isDragging
                        ? 'Drop files or folders here'
                        : 'Drag & drop files or an entire folder here'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Nested subfolders are automatically recreated
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <FileUp className="w-3.5 h-3.5 text-[#4361ee]" />
                        <span>Browse Files</span>
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => folderInputRef.current?.click()}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-xs font-semibold text-[#4361ee] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <FolderUp className="w-3.5 h-3.5" />
                        <span>Browse Folder</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed">
                      Allowed: {formattedAllowedLabel} · Max {uploadRules.maxUploadSizeMB}MB/file
                    </p>
                  </>
                )}
              </div>

              {/* Queued Files & Folders Summary */}
              {hasQueuedContent && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      {folderPaths.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100/80 text-[#4361ee] text-[11px]">
                          <Folder className="w-3 h-3" />
                          {folderPaths.length} folder{folderPaths.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px]">
                        <FileText className="w-3 h-3 text-[#4361ee]" />
                        {validItems.length} file{validItems.length !== 1 ? 's' : ''} ({formatBytes(totalBytes)})
                      </span>
                    </div>
                    {!loading && (
                      <button
                        type="button"
                        onClick={handleClearQueue}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>

                  {validItems.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {validItems.map((item) => (
                        <div
                          key={`${item.relativePath}-${item.file.size}`}
                          className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 text-[11px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-[#4361ee] shrink-0" />
                            <span
                              className="text-slate-700 font-medium truncate"
                              title={item.relativePath}
                            >
                              {item.relativePath}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] text-slate-400">
                              {formatBytes(item.file.size)}
                            </span>
                            {!loading && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQueuedFile(item.relativePath)}
                                className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                                aria-label={`Remove ${item.file.name}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Skipped Files Warning */}
              {skippedItems.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      {skippedItems.length} file{skippedItems.length > 1 ? 's' : ''} skipped (restricted by policy or over {uploadRules.maxUploadSizeMB}MB)
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-700/90 truncate">
                    {skippedItems
                      .slice(0, 3)
                      .map((s) => s.file.name)
                      .join(', ')}
                    {skippedItems.length > 3 ? ` +${skippedItems.length - 3} more` : ''}
                  </p>
                </div>
              )}

              {/* Live Upload Progress Bar */}
              {uploadProgress && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-900">
                    <span className="truncate pr-2">{uploadProgress.message}</span>
                    <span className="shrink-0 font-mono text-[#4361ee]">
                      {uploadProgress.percent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4361ee] rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-1 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !hasQueuedContent}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#4361ee] hover:bg-[#3652db] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-900/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {loading
                      ? 'Uploading...'
                      : folderPaths.length > 0
                        ? `Upload Folder${validItems.length > 0 ? ` (${validItems.length})` : ''}`
                        : validItems.length > 1
                          ? `Upload ${validItems.length} Files`
                          : 'Upload Document'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
