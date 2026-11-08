import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Folder,
  FileText,
  FileSpreadsheet,
  Download,
  Trash2,
  Loader2,
  ArrowLeft,
  HardDrive,
  ShieldCheck,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
} from 'lucide-react';
import { getUsersApi, getFolders, getDocuments, downloadDocument, moveToTrash } from '../services/api';
import FolderCard from '../components/FolderCard';

export default function AllFilesPage() {
  const navigate = useNavigate();

  // Users Directory state
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Pagination & Search state (Optimal 6 cards per page for 3-col desktop / 2-col tablet)
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 6;

  // Selected User's storage content state
  const [userFolders, setUserFolders] = useState([]);
  const [userFiles, setUserFiles] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch all users on mount
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await getUsersApi();
      if (res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.warn('Failed to load users directory:', err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // When a user is clicked, fetch their specific folders and documents
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    try {
      setLoadingContent(true);
      const [foldersRes, docsRes] = await Promise.all([
        getFolders({ userId: user._id, parentId: 'null' }),
        getDocuments({ userId: user._id, isDeleted: false }),
      ]);
      if (foldersRes.data) setUserFolders(foldersRes.data);
      if (docsRes.data) setUserFiles(docsRes.data);
    } catch (err) {
      console.warn(`Could not fetch storage for user ${user.name}:`, err.message);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      setDownloadingId(file._id);
      await downloadDocument(file._id, file.originalName || file.name);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!confirm('Move this document to trash?')) return;
    try {
      await moveToTrash(id);
      setUserFiles((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error(err);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // -------------------------------------------------------------
  // VIEW 1: SELECTED USER STORAGE DRILL-DOWN
  // -------------------------------------------------------------
  if (selectedUser) {
    return (
      <main className="px-6 sm:px-10 lg:px-12 py-7 w-full space-y-7">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs">
          <button
            onClick={() => setSelectedUser(null)}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#4361ee] hover:text-[#3651d4] mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Users Directory</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4361ee] font-bold text-base flex items-center justify-center shrink-0">
                {getInitials(selectedUser.name)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {selectedUser.name}
                  </h1>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {selectedUser.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {selectedUser.email} · Storage Footprint: {selectedUser.storageMB || '0.00'} MB
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span>
                {userFolders.length} Folders · {userFiles.length} Files
              </span>
            </div>
          </div>
        </div>

        {/* Loading Content State */}
        {loadingContent ? (
          <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#4361ee]" />
            <span>Loading user folders and documents...</span>
          </div>
        ) : (
          <>
            {/* User Folders Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Folder className="w-4 h-4 text-[#4361ee]" />
                <span>Folders ({userFolders.length})</span>
              </h2>

              {userFolders.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400">
                  <Folder className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-medium">This user has not created any folders yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4.5">
                  {userFolders.map((f) => (
                    <FolderCard
                      key={f._id}
                      folder={f}
                      onClick={() => navigate(`/folders/${encodeURIComponent(f.name)}`)}
                      onDeleteFolder={() => {
                        setUserFolders((prev) => prev.filter((item) => item._id !== f._id));
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* User Documents Section */}
            <section className="space-y-4 pt-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#4361ee]" />
                <span>Documents ({userFiles.length})</span>
              </h2>

              {userFiles.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-medium">No documents uploaded by this user yet.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[540px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                        <th className="py-3 px-5">Name</th>
                        <th className="py-3 px-4">Folder</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Uploaded</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {userFiles.map((item) => {
                        const isDownloading = downloadingId === item._id;
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-5">
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
                            <td className="py-3 px-4 text-slate-500 font-medium">{item.folder}</td>
                            <td className="py-3 px-4 text-slate-400">{formatSize(item.fileSize)}</td>
                            <td className="py-3 px-4 text-slate-400">{formatDate(item.createdAt)}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleDownload(item)}
                                  disabled={isDownloading}
                                  title="Download File"
                                  className="p-1.5 text-slate-400 hover:text-[#4361ee] rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  {isDownloading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4361ee]" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteDoc(item._id)}
                                  title="Move to Trash"
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            </section>
          </>
        )}
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: MASTER USERS DIRECTORY (DEFAULT ADMIN VIEW)
  // -------------------------------------------------------------
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / cardsPerPage));
  const startIndex = (currentPage - 1) * cardsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + cardsPerPage);

  const startEntry = filteredUsers.length === 0 ? 0 : startIndex + 1;
  const endEntry = Math.min(startIndex + cardsPerPage, filteredUsers.length);

  return (
    <main className="px-4 sm:px-8 lg:px-12 py-5 sm:py-7 w-full space-y-6 sm:space-y-7">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              User Directories
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#e0e7ff] text-[#4361ee] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Admin Master View
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Select any user to inspect and manage their private folders, documents, and storage footprint.
          </p>
        </div>

        {/* Search Users Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee] shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Users Grid */}
      {loadingUsers ? (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#4361ee]" />
          <span>Loading user directories...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No users found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery ? `No users matching "${searchQuery}"` : 'No registered users in system yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {paginatedUsers.map((u) => {
              return (
                <div
                  key={u._id}
                  onClick={() => handleSelectUser(u)}
                  className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-[#4361ee]/50 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#4361ee] font-bold text-sm flex items-center justify-center border border-indigo-100 group-hover:bg-[#4361ee] group-hover:text-white transition-colors">
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#4361ee] transition-colors truncate">
                            {u.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono truncate">{u.email}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>

                    {/* Storage stats */}
                    <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center mb-4">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{u.folderCount}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Folders</p>
                      </div>
                      <div className="border-x border-slate-200">
                        <p className="text-xs font-bold text-slate-800">{u.fileCount}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Files</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{u.storageMB} MB</p>
                        <p className="text-[10px] text-slate-400 font-medium">Used</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#4361ee]">
                    <span>Browse User Storage</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 pb-2 border-t border-slate-200/70">
            <p className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{startEntry}</span> to{' '}
              <span className="font-bold text-slate-800">{endEntry}</span> of{' '}
              <span className="font-bold text-slate-800">{filteredUsers.length}</span> users (6 per page)
            </p>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-[#4361ee] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
