import { createFolder, getFolders, uploadDocument } from '../services/api';

export const DEFAULT_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'svg',
  'zip',
  'txt',
  'csv',
];

export const ALLOWED_EXTENSIONS = DEFAULT_ALLOWED_EXTENSIONS.map((e) => `.${e}`);

const IGNORED_SYSTEM_FILES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
]);

export const DEFAULT_MAX_UPLOAD_SIZE_MB = 25;
export const MAX_SIZE_BYTES = DEFAULT_MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export function isIgnoredSystemFile(fileName) {
  if (!fileName) return true;
  const lower = fileName.toLowerCase();
  return IGNORED_SYSTEM_FILES.has(lower) || lower.startsWith('._');
}

export function normalizeExtensionsList(exts) {
  if (!Array.isArray(exts)) return [...DEFAULT_ALLOWED_EXTENSIONS];
  return exts
    .map((e) => String(e).toLowerCase().trim().replace(/^\./, ''))
    .filter(Boolean);
}

/**
 * Validate a single File against live Admin Settings (allowedExtensions & maxUploadSizeMB)
 */
export function validateUploadFile(file, uploadRules = null) {
  const allowedNoDot = uploadRules && Array.isArray(uploadRules.allowedExtensions)
    ? normalizeExtensionsList(uploadRules.allowedExtensions)
    : [...DEFAULT_ALLOWED_EXTENSIONS];

  const maxMB = Number(uploadRules?.maxUploadSizeMB) || DEFAULT_MAX_UPLOAD_SIZE_MB;
  const maxBytes = maxMB * 1024 * 1024;

  const parts = (file.name || '').split('.');
  const extNoDot = parts.length > 1 ? parts.pop().toLowerCase() : '';
  const extWithDot = extNoDot ? `.${extNoDot}` : 'unknown';

  if (allowedNoDot.length === 0) {
    return {
      valid: false,
      reason: 'Uploads are currently disabled (no file extensions are enabled in Admin Settings).',
    };
  }

  if (!extNoDot || !allowedNoDot.includes(extNoDot)) {
    return {
      valid: false,
      reason: `File type "${extWithDot}" is disabled by administrator policy.`,
    };
  }

  if (file.size > maxBytes) {
    return {
      valid: false,
      reason: `Exceeds ${maxMB} MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  return { valid: true };
}

/**
 * Read ALL entries from a FileSystemDirectoryReader.
 * Browsers (especially Chrome) return at most 100 entries per readEntries() call,
 * so we must keep calling until an empty array is returned.
 */
function readAllDirectoryEntries(directoryReader) {
  return new Promise((resolve, reject) => {
    const entries = [];
    const readBatch = () => {
      directoryReader.readEntries(
        (batch) => {
          if (!batch || batch.length === 0) {
            resolve(entries);
          } else {
            entries.push(...batch);
            readBatch();
          }
        },
        (err) => reject(err)
      );
    };
    readBatch();
  });
}

function getFileFromEntry(fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
}

async function traverseFileSystemEntry(entry, parentPath, fileItems, folderSet) {
  if (!entry) return;

  if (entry.isFile) {
    if (isIgnoredSystemFile(entry.name)) return;
    try {
      const file = await getFileFromEntry(entry);
      const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      fileItems.push({
        file,
        relativePath,
        folderPath: parentPath,
      });
    } catch (err) {
      console.warn(`Could not read dropped file "${entry.name}":`, err);
    }
  } else if (entry.isDirectory) {
    const dirPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    folderSet.add(dirPath);

    try {
      const reader = entry.createReader();
      const children = await readAllDirectoryEntries(reader);
      for (const child of children) {
        await traverseFileSystemEntry(child, dirPath, fileItems, folderSet);
      }
    } catch (err) {
      console.warn(`Could not read dropped directory "${dirPath}":`, err);
    }
  }
}

/**
 * Extract files and nested folder paths from a drag-and-drop DataTransfer object.
 * Supports dropping single files, multiple files, folders, and nested subfolders.
 */
export async function extractEntriesFromDataTransfer(dataTransfer) {
  const fileItems = [];
  const folderSet = new Set();

  if (dataTransfer.items && dataTransfer.items.length > 0) {
    // Capture entries synchronously before awaiting anything (DataTransfer clears after tick)
    const entries = [];
    const fallbackFiles = [];

    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item.kind !== 'file') continue;

      if (typeof item.webkitGetAsEntry === 'function') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          entries.push(entry);
          continue;
        }
      }

      const file = item.getAsFile();
      if (file) fallbackFiles.push(file);
    }

    for (const entry of entries) {
      await traverseFileSystemEntry(entry, '', fileItems, folderSet);
    }

    for (const file of fallbackFiles) {
      if (isIgnoredSystemFile(file.name)) continue;
      fileItems.push({
        file,
        relativePath: file.name,
        folderPath: '',
      });
    }
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    return extractEntriesFromFileList(dataTransfer.files);
  }

  return {
    items: fileItems,
    folders: Array.from(folderSet),
  };
}

/**
 * Extract files and nested folder paths from a FileList (<input type="file" multiple />
 * or <input type="file" webkitdirectory />).
 */
export function extractEntriesFromFileList(fileList) {
  const fileItems = [];
  const folderSet = new Set();

  const files = Array.from(fileList || []);
  for (const file of files) {
    if (isIgnoredSystemFile(file.name)) continue;

    const rawRelPath = file.webkitRelativePath || file.name;
    const normalized = rawRelPath.replace(/^\/+/, '');
    const segments = normalized.split('/').filter(Boolean);

    let folderPath = '';
    if (segments.length > 1) {
      const dirSegments = segments.slice(0, -1);
      folderPath = dirSegments.join('/');

      // Register every intermediate folder path so nested trees are created in order
      let acc = '';
      for (const seg of dirSegments) {
        acc = acc ? `${acc}/${seg}` : seg;
        folderSet.add(acc);
      }
    }

    fileItems.push({
      file,
      relativePath: normalized,
      folderPath,
    });
  }

  return {
    items: fileItems,
    folders: Array.from(folderSet),
  };
}

/**
 * Partition extracted file items into valid and skipped lists using live uploadRules.
 */
export function partitionUploadItems(items, uploadRules = null) {
  const valid = [];
  const skipped = [];

  for (const item of items) {
    const check = validateUploadFile(item.file, uploadRules);
    if (check.valid) {
      valid.push(item);
    } else {
      skipped.push({
        ...item,
        reason: check.reason,
      });
    }
  }

  return { valid, skipped };
}

/**
 * Recreate folder hierarchy in backend (reusing existing folders if already present)
 * and upload all valid files into their respective folderId.
 */
export async function executeBatchUpload({
  validItems,
  folderPaths,
  baseParentId = null,
  baseFolderName = 'Team Folder',
  onProgress,
}) {
  const report = (state) => {
    if (typeof onProgress === 'function') onProgress(state);
  };

  // Collect all required folder paths (including intermediate ancestors)
  const allFolderPathsSet = new Set();
  const addPathWithAncestors = (p) => {
    if (!p) return;
    const parts = p.split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      allFolderPathsSet.add(acc);
    }
  };

  for (const fp of folderPaths || []) addPathWithAncestors(fp);
  for (const item of validItems || []) addPathWithAncestors(item.folderPath);

  // Sort shallowest to deepest so parents are always created before children
  const sortedFolderPaths = Array.from(allFolderPathsSet).sort(
    (a, b) => a.split('/').length - b.split('/').length
  );

  // Fetch existing folders to avoid 409 conflicts and reuse existing folders seamlessly
  const existingMap = new Map(); // `${parentId || 'root'}::${name.toLowerCase()}` -> folderDoc
  try {
    const existingRes = await getFolders({ all: 'true' });
    if (Array.isArray(existingRes?.data)) {
      for (const f of existingRes.data) {
        const key = `${f.parentId || 'root'}::${(f.name || '').trim().toLowerCase()}`;
        existingMap.set(key, f);
      }
    }
  } catch (err) {
    console.warn('Could not preload existing folders before batch upload:', err.message);
  }

  // Map relative folder path -> { _id, name }
  const resolvedFolderMap = new Map();
  let createdFoldersCount = 0;

  // Step 1: Create or reuse folder hierarchy
  if (sortedFolderPaths.length > 0) {
    report({
      phase: 'folders',
      message: `Preparing ${sortedFolderPaths.length} folder${sortedFolderPaths.length > 1 ? 's' : ''}...`,
      completedFiles: 0,
      totalFiles: validItems.length,
      percent: 5,
    });

    for (let i = 0; i < sortedFolderPaths.length; i++) {
      const relPath = sortedFolderPaths[i];
      const parts = relPath.split('/');
      const name = parts[parts.length - 1];
      const parentRelPath = parts.slice(0, -1).join('/');

      const parentFolderId = parentRelPath
        ? resolvedFolderMap.get(parentRelPath)?._id || baseParentId
        : baseParentId;

      const lookupKey = `${parentFolderId || 'root'}::${name.toLowerCase()}`;
      const existing = existingMap.get(lookupKey);

      if (existing) {
        resolvedFolderMap.set(relPath, { _id: existing._id, name: existing.name });
      } else {
        try {
          const res = await createFolder({
            name,
            parentId: parentFolderId || null,
          });
          const created = res?.data;
          if (created?._id) {
            resolvedFolderMap.set(relPath, { _id: created._id, name: created.name });
            existingMap.set(lookupKey, created);
            createdFoldersCount++;
          }
        } catch (err) {
          // Handle race condition 409 by fetching siblings under parentFolderId
          if (err?.response?.status === 409) {
            const sibRes = await getFolders({ parentId: parentFolderId || 'null' });
            const match = (sibRes?.data || []).find(
              (f) => (f.name || '').trim().toLowerCase() === name.toLowerCase()
            );
            if (match) {
              resolvedFolderMap.set(relPath, { _id: match._id, name: match.name });
              existingMap.set(lookupKey, match);
              continue;
            }
          }
          throw err;
        }
      }
    }
  }

  // Step 2: Upload all valid files into their target folder
  const totalFiles = validItems.length;
  let completedFiles = 0;
  const uploadedFiles = [];
  const failedFiles = [];

  if (totalFiles === 0) {
    report({
      phase: 'done',
      message: 'Folder structure created!',
      completedFiles: 0,
      totalFiles: 0,
      percent: 100,
    });
    return { createdFoldersCount, uploadedFiles, failedFiles };
  }

  const CONCURRENCY = 2;
  let cursor = 0;

  const uploadWorker = async () => {
    while (cursor < totalFiles) {
      const idx = cursor++;
      const item = validItems[idx];

      const targetInfo = item.folderPath
        ? resolvedFolderMap.get(item.folderPath)
        : null;

      const finalFolderId = targetInfo?._id || baseParentId || null;
      const finalFolderName = targetInfo?.name || baseFolderName || 'Team Folder';

      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('folder', finalFolderName);
      if (finalFolderId) {
        formData.append('folderId', finalFolderId);
      }

      report({
        phase: 'uploading',
        message: `Uploading ${item.file.name} (${completedFiles + 1} of ${totalFiles})...`,
        currentFile: item.relativePath,
        completedFiles,
        totalFiles,
        percent: Math.min(95, Math.round(10 + (completedFiles / totalFiles) * 85)),
      });

      try {
        const res = await uploadDocument(formData);
        uploadedFiles.push({
          ...item,
          document: res?.data,
        });
      } catch (err) {
        failedFiles.push({
          ...item,
          error: err?.response?.data?.message || err?.message || 'Upload failed',
        });
      } finally {
        completedFiles++;
        report({
          phase: 'uploading',
          message: `Uploaded ${completedFiles} of ${totalFiles} file${totalFiles > 1 ? 's' : ''}...`,
          currentFile: item.relativePath,
          completedFiles,
          totalFiles,
          percent: Math.min(99, Math.round(10 + (completedFiles / totalFiles) * 89)),
        });
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, totalFiles) },
    () => uploadWorker()
  );
  await Promise.all(workers);

  report({
    phase: 'done',
    message: 'Upload complete!',
    completedFiles,
    totalFiles,
    percent: 100,
  });

  return {
    createdFoldersCount,
    uploadedFiles,
    failedFiles,
  };
}

