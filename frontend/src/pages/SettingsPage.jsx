import React, { useState, useEffect } from 'react';
import {
  Sliders,
  HardDrive,
  ShieldCheck,
  Users,
  Trash2,
  Database,
  Cloud,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  KeyRound,
  RefreshCw,
  X,
  FileCheck,
  UserPlus,
  Lock,
} from 'lucide-react';
import {
  getSettingsApi,
  updateSettingsApi,
  purgeTrashApi,
  getUsersApi,
  createAdminUserApi,
  resetUserPasswordApi,
} from '../services/api';
import { toast } from 'sonner';

const COMMON_EXTENSIONS = [
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('storage'); // 'storage' | 'security' | 'users' | 'maintenance'

  // Settings State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [maxUploadSizeMB, setMaxUploadSizeMB] = useState(25);
  const [allowedExtensions, setAllowedExtensions] = useState(COMMON_EXTENSIONS);
  const [newExtensionInput, setNewExtensionInput] = useState('');
  const [publicSharingEnabled, setPublicSharingEnabled] = useState(true);
  const [defaultShareExpirationDays, setDefaultShareExpirationDays] = useState(30);

  // Stats & Infrastructure
  const [stats, setStats] = useState({
    totalDocuments: 0,
    trashDocuments: 0,
    activeStorageBytes: 0,
    trashStorageBytes: 0,
    totalFolders: 0,
    totalUsers: 0,
  });
  const [infrastructure, setInfrastructure] = useState({
    mongo: { connected: false, dbName: '' },
    r2: { configured: false, bucketName: '', endpoint: '' },
  });

  // Users Management State
  const [usersList, setUsersList] = useState([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Reset Password Modal State
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Trash Purge State
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [settingsRes, usersRes] = await Promise.all([
        getSettingsApi(),
        getUsersApi().catch(() => ({ data: [] })),
      ]);

      if (settingsRes?.data) {
        const { settings, stats, infrastructure } = settingsRes.data;
        if (settings) {
          setMaxUploadSizeMB(settings.maxUploadSizeMB || 25);
          setAllowedExtensions(settings.allowedExtensions || COMMON_EXTENSIONS);
          setPublicSharingEnabled(
            settings.publicSharingEnabled !== undefined ? settings.publicSharingEnabled : true
          );
          setDefaultShareExpirationDays(
            settings.defaultShareExpirationDays !== undefined
              ? settings.defaultShareExpirationDays
              : 30
          );
        }
        if (stats) setStats(stats);
        if (infrastructure) setInfrastructure(infrastructure);
      }

      if (usersRes?.data) {
        setUsersList(usersRes.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setErrorMsg(err?.response?.data?.message || err?.message || 'Error loading settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      await updateSettingsApi({
        maxUploadSizeMB,
        allowedExtensions,
        publicSharingEnabled,
        defaultShareExpirationDays,
      });
      setSaveSuccess(true);
      toast.success('System configuration saved successfully');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update settings.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleExtension = (ext) => {
    setAllowedExtensions((prev) =>
      prev.includes(ext) ? prev.filter((item) => item !== ext) : [...prev, ext]
    );
  };

  const handleAddCustomExtension = (e) => {
    e.preventDefault();
    const cleanExt = newExtensionInput.trim().toLowerCase().replace(/^\./, '');
    if (cleanExt && !allowedExtensions.includes(cleanExt)) {
      setAllowedExtensions([...allowedExtensions, cleanExt]);
      setNewExtensionInput('');
      toast.success(`Added .${cleanExt} format`);
    }
  };

  const handlePurgeTrash = async () => {
    if (
      !window.confirm(
        'Are you sure you want to permanently purge all items in Trash? This deletes both database entries and files from Cloudflare R2.'
      )
    ) {
      return;
    }
    try {
      setPurging(true);
      const res = await purgeTrashApi();
      setPurgeResult(res.message);
      toast.success(res.message);
      fetchData();
      setTimeout(() => setPurgeResult(null), 4000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to purge trash.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setPurging(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      await createAdminUserApi(newUser);
      setShowCreateUserModal(false);
      toast.success(`Account created for ${newUser.name}`);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create user');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword) return;
    try {
      setResetSubmitting(true);
      await resetUserPasswordApi(resetTargetUser.id || resetTargetUser._id, newPassword);
      toast.success(`Password reset for ${resetTargetUser.name}`);
      setResetTargetUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to reset password');
    } finally {
      setResetSubmitting(false);
    }
  };

  const activeStorageMB = (stats.activeStorageBytes / (1024 * 1024)).toFixed(2);
  const trashStorageMB = (stats.trashStorageBytes / (1024 * 1024)).toFixed(2);

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Admin Configuration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-[#5370ff]" />
              Master Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real storage constraints, security policies, user management, and system maintenance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#4361ee] hover:bg-[#3652db] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-70"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">System configuration saved successfully.</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* System Infrastructure Live Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* MongoDB Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800">Local MongoDB</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  infrastructure.mongo.connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              {infrastructure.mongo.dbName || 'document_management_db'}
            </p>
          </div>
        </div>

        {/* Cloudflare R2 Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800">Cloudflare R2</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  infrastructure.r2.configured ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              {infrastructure.r2.bucketName}
            </p>
          </div>
        </div>

        {/* Real Live Storage Meter Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex items-center space-x-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4361ee] flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-800">Live Storage Consumed</span>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              {activeStorageMB} MB <span className="font-normal text-slate-400">({stats.totalDocuments} active files)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-4 sm:space-x-6 overflow-x-auto pb-0 scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab('storage')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'storage'
              ? 'border-[#4361ee] text-[#4361ee]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Storage & Upload Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'security'
              ? 'border-[#4361ee] text-[#4361ee]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Link Sharing</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'users'
              ? 'border-[#4361ee] text-[#4361ee]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'maintenance'
              ? 'border-[#4361ee] text-[#4361ee]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Maintenance & Purge</span>
        </button>
      </div>

      {/* TAB 1: Storage & Upload Rules */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Max Upload File Size
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enforces the maximum allowed size per individual uploaded file across all users.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {[10, 25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMaxUploadSizeMB(preset)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    maxUploadSizeMB === preset
                      ? 'bg-[#4361ee] text-white border-[#4361ee] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset} MB
                </button>
              ))}

              <div className="flex items-center space-x-2 ml-2">
                <span className="text-xs text-slate-500">Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={maxUploadSizeMB}
                  onChange={(e) => setMaxUploadSizeMB(Number(e.target.value))}
                  className="w-20 px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee]"
                />
                <span className="text-xs text-slate-400">MB</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Allowed File Extensions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-4">
                Restrict uploads to authorized file formats. Unchecked formats will be rejected.
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_EXTENSIONS.map((ext) => {
                  const isChecked = allowedExtensions.includes(ext);
                  return (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => handleToggleExtension(ext)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50 text-[#4361ee] border-blue-200 font-semibold'
                          : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>.{ext}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add custom extension */}
              <form onSubmit={handleAddCustomExtension} className="flex items-center space-x-2 max-w-sm">
                <input
                  type="text"
                  placeholder="e.g. mp4, json, tar"
                  value={newExtensionInput}
                  onChange={(e) => setNewExtensionInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4361ee]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Add Format
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Security & Link Sharing */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            {/* Master Share Killswitch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span>Global Public Share Link Killswitch</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                  When deactivated, all public share tokens (<code className="font-mono text-slate-600 bg-slate-100 px-1 rounded">/shared-link/:token</code>) are instantly shut down system-wide. No external visitor can access any file or folder.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPublicSharingEnabled(!publicSharingEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  publicSharingEnabled ? 'bg-[#4361ee]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    publicSharingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Default Link Expiration */}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Default Share Link Expiration
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">
                Pre-select the default lifespan for newly created public links.
              </p>

              <select
                value={defaultShareExpirationDays}
                onChange={(e) => setDefaultShareExpirationDays(Number(e.target.value))}
                className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee]"
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days (Recommended)</option>
                <option value={90}>90 Days</option>
                <option value={0}>Never Expire (Permanent)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: User Accounts & Directory Management */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Authorized User Accounts
              </h2>
              <p className="text-xs text-slate-400">
                Manage accounts with access to CloudXen personal storage directories.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateUserModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Documents</th>
                    <th className="py-3 px-4">Storage Used</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => {
                    const userStorageMB = ((u.totalBytes || 0) / (1024 * 1024)).toFixed(2);
                    return (
                      <tr key={u.id || u._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-[#4361ee]'
                            }`}
                          >
                            {u.role === 'admin' ? 'Administrator' : 'Standard User'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {u.fileCount || 0} files
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {userStorageMB} MB
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setResetTargetUser(u)}
                            className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset Password</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Maintenance & Trash Purge */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Permanent Trash Purge
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Items moved to Trash remain recoverable until permanently purged. Purging permanently removes soft-deleted metadata from MongoDB and physically deletes binary objects from the Cloudflare R2 bucket.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Current Soft-Deleted Items in Trash:</span>
                <span className="text-lg font-bold text-slate-900">
                  {stats.trashDocuments} documents ({trashStorageMB} MB)
                </span>
              </div>

              <button
                type="button"
                onClick={handlePurgeTrash}
                disabled={purging || stats.trashDocuments === 0}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{purging ? 'Purging...' : 'Permanently Purge Trash'}</span>
              </button>
            </div>

            {purgeResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{purgeResult}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Create New User */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Create New Account</h3>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john@cloud.local"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="user">Standard User (Personal Drive)</option>
                  <option value="admin">Administrator (Full Master Console)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#4361ee] text-white rounded-xl shadow-xs"
                >
                  {createSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <button
                onClick={() => setResetTargetUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new password for <span className="font-semibold text-slate-800">{resetTargetUser.name}</span> (<code className="font-mono">{resetTargetUser.email}</code>).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl shadow-xs"
                >
                  {resetSubmitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
