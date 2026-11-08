import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// Attach JWT token to requests if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 Unauthorized responses to auto-logout invalid/expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get an unauthorized error on protected calls, clear stale auth data
      if (!error.config.url.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Auth endpoints
 */
export const loginApi = async (email, password, turnstileToken) => {
  const response = await api.post('/auth/login', { email, password, turnstileToken });
  return response.data;
};

export const googleLoginApi = async (credential) => {
  const response = await api.post('/auth/google', { credential });
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const getUsersApi = async () => {
  const response = await api.get('/auth/users');
  return response.data;
};

/**
 * Shareable Link Access APIs
 */
export const generateFolderShareLink = async (id, permission = 'viewer') => {
  const response = await api.post(`/share/folder/${id}`, { permission });
  return response.data;
};

export const disableFolderShareLink = async (id) => {
  const response = await api.delete(`/share/folder/${id}`);
  return response.data;
};

export const generateDocumentShareLink = async (id, permission = 'viewer') => {
  const response = await api.post(`/share/document/${id}`, { permission });
  return response.data;
};

export const disableDocumentShareLink = async (id) => {
  const response = await api.delete(`/share/document/${id}`);
  return response.data;
};

export const resolveShareToken = async (token) => {
  const response = await api.get(`/share/resolve/${token}`);
  return response.data;
};

export const getSharedFolderContents = async (token, parentId) => {
  const response = await api.get(`/share/folder/${token}/contents`, {
    params: { parentId },
  });
  return response.data;
};

export const pinSharedItem = async (token) => {
  const response = await api.post(`/share/pin/${token}`);
  return response.data;
};

/**
 * Health check
 */
export const getHealthStatus = async () => {
  const response = await api.get('/health');
  return response.data;
};

/**
 * Fetch documents with optional query filters:
 * folder, category, isFavorite, isDeleted, search
 */
export const getDocuments = async (params = {}) => {
  const response = await api.get('/documents', { params });
  return response.data;
};

/**
 * Upload a document (Strictly document files)
 * Accepts a FormData object with 'file', 'folder', 'author'
 */
export const uploadDocument = async (formData, onProgress) => {
  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

/**
 * Download a document by ID
 * Uses blob responseType and triggers browser download
 */
export const downloadDocument = async (id, fileName = 'downloaded_document') => {
  const response = await api.get(`/documents/${id}/download`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
};

/**
 * Toggle document favorite status
 */
export const toggleFavorite = async (id) => {
  const response = await api.patch(`/documents/${id}/favorite`);
  return response.data;
};

export const togglePinDocument = async (id) => {
  const response = await api.patch(`/documents/${id}/pin`);
  return response.data;
};

/**
 * Move document to trash
 */
export const moveToTrash = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};

/**
 * Restore document from trash
 */
export const restoreFromTrash = async (id) => {
  const response = await api.patch(`/documents/${id}/restore`);
  return response.data;
};

/**
 * Permanently delete document
 */
export const deletePermanently = async (id) => {
  const response = await api.delete(`/documents/${id}/permanent`);
  return response.data;
};

/**
 * Folder endpoints
 */
export const getFolders = async (params = {}) => {
  const response = await api.get('/folders', { params });
  return response.data;
};

export const getFolderById = async (id) => {
  const response = await api.get(`/folders/${id}`);
  return response.data;
};

export const createFolder = async (folderData) => {
  const response = await api.post('/folders', folderData);
  return response.data;
};

export const renameFolder = async (id, name) => {
  const response = await api.patch(`/folders/${id}/rename`, { name });
  return response.data;
};

export const togglePinFolder = async (id) => {
  const response = await api.patch(`/folders/${id}/pin`);
  return response.data;
};

export const toggleFavoriteFolder = async (id) => {
  const response = await api.patch(`/folders/${id}/favorite`);
  return response.data;
};

export const deleteFolder = async (id, mode = 'cascade') => {
  const response = await api.delete(`/folders/${id}`, { params: { mode } });
  return response.data;
};

export const downloadFolderZip = async (id, folderName = 'folder') => {
  const response = await api.get(`/folders/${id}/download-zip`, {
    responseType: 'blob',
    timeout: 60000,
  });
  const blob = new Blob([response.data], { type: 'application/zip' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${folderName}.zip`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
};

/**
 * Admin System Settings APIs
 */
export const getSettingsApi = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSettingsApi = async (payload) => {
  const response = await api.put('/settings', payload);
  return response.data;
};

export const purgeTrashApi = async () => {
  const response = await api.post('/settings/purge-trash');
  return response.data;
};

export const createAdminUserApi = async (userData) => {
  const response = await api.post('/settings/users', userData);
  return response.data;
};

export const resetUserPasswordApi = async (userId, newPassword) => {
  const response = await api.post(`/settings/users/${userId}/reset-password`, {
    newPassword,
  });
  return response.data;
};

export default api;
