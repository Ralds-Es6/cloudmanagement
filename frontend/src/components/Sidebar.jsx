import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Cloud,
  FolderGit2,
  Users,
  Star,
  Clock,
  Share2,
  Trash2,
  Sliders,
  Plus,
  HardDrive,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  X,
} from 'lucide-react';
import { getDocuments, getFolders } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onCreateNew, mobileOpen = false, onCloseMobile }) {
  const { user, isAdmin } = useAuth();
  const [totalStorageMB, setTotalStorageMB] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

  // Persistent collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const fetchStats = async () => {
    try {
      const [activeRes, trashRes, favDocsRes, favFoldersRes] = await Promise.all([
        getDocuments({ isDeleted: false }),
        getDocuments({ isDeleted: true }),
        getDocuments({ isFavorite: 'true', isDeleted: false }),
        getFolders({ isFavorite: 'true' }),
      ]);

      if (activeRes.data) {
        const bytes = activeRes.data.reduce((sum, d) => sum + (d.fileSize || 0), 0);
        setTotalStorageMB((bytes / (1024 * 1024)).toFixed(2));
      }
      if (trashRes.data) {
        setTrashCount(trashRes.data.length);
      }
      const favTotal = (favDocsRes.data?.length || 0) + (favFoldersRes.data?.length || 0);
      setFavoriteCount(favTotal);
    } catch (err) {
      console.warn('Could not fetch sidebar stats:', err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleRefresh = () => fetchStats();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  // Navigation Items
  const navItems = isAdmin
    ? [
        { path: '/all-files', label: 'User Directories', icon: Users },
        { path: '/my-files', label: 'My Files', icon: FolderGit2 },
        { path: '/shared', label: 'Shared with me', icon: Share2 },
        {
          path: '/favorites',
          label: 'Favorite',
          icon: Star,
          badge: favoriteCount > 0 ? String(favoriteCount) : undefined,
        },
        { path: '/recents', label: 'Recents', icon: Clock },
        {
          path: '/trash',
          label: 'Deleted files',
          icon: Trash2,
          badge: trashCount > 0 ? String(trashCount) : undefined,
        },
        { path: '/settings', label: 'Admin Settings', icon: Sliders },
      ]
    : [
        { path: '/my-files', label: 'My Files', icon: FolderGit2 },
        { path: '/shared', label: 'Shared with me', icon: Share2 },
        {
          path: '/favorites',
          label: 'Favorite',
          icon: Star,
          badge: favoriteCount > 0 ? String(favoriteCount) : undefined,
        },
        { path: '/recents', label: 'Recents', icon: Clock },
        {
          path: '/trash',
          label: 'Trash',
          icon: Trash2,
          badge: trashCount > 0 ? String(trashCount) : undefined,
        },
      ];

  const defaultHome = isAdmin ? '/all-files' : '/my-files';

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-30 h-screen bg-[#141d44] text-slate-300 flex flex-col justify-between select-none shrink-0 border-r border-[#1e2a5e] transition-all duration-300 ease-in-out ${
          /* Mobile Drawer: slide in/out */
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          /* Desktop Rail / Expanded Width */
          isCollapsed ? 'lg:w-20 lg:p-3' : 'lg:w-60 xl:w-64 lg:p-3.5 xl:p-4'
        } w-72 p-4`}
      >
        {/* ------------------------------------------------------------- */}
        {/* 1. SEAM TOGGLE PILL (Desktop Only: Linear/Figma style floating) */}
        {/* ------------------------------------------------------------- */}
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute -right-3 top-7 w-6 h-6 rounded-full bg-[#1c2759] hover:bg-[#4361ee] text-slate-300 hover:text-white border border-[#2d3d82] shadow-md items-center justify-center transition-all cursor-pointer z-40 hover:scale-110 active:scale-95"
        >
          <ChevronLeft
            className={`w-3.5 h-3.5 transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-none pr-0.5">
          {/* ------------------------------------------------------------- */}
          {/* 2. HEADER BRAND & MOBILE CLOSE                                */}
          {/* ------------------------------------------------------------- */}
          <div
            className={`flex items-center justify-between mb-3 transition-all ${
              isCollapsed ? 'lg:justify-center py-1.5' : 'px-1.5 py-1.5'
            }`}
          >
            {/* Logo / Link */}
            <NavLink
              to={defaultHome}
              onClick={() => onCloseMobile && onCloseMobile()}
              className="flex items-center space-x-2.5 cursor-pointer group"
              title="CloudXen"
            >
              <div className="w-8 h-8 rounded-xl bg-[#4361ee] text-white flex items-center justify-center shadow-md shadow-[#4361ee]/30 group-hover:scale-105 transition-transform shrink-0">
                <Cloud className="w-5 h-5 stroke-[2.4]" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <span className="font-bold text-lg tracking-tight truncate">
                  <span className="text-white">Cloud</span>
                  <span className="text-[#5370ff]">Xen</span>
                </span>
              )}
            </NavLink>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2759] transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. WORKSPACE / ROLE BADGE CARD                                */}
        {/* ------------------------------------------------------------- */}
        {!isCollapsed ? (
          <div className="bg-[#1c2759]/80 border border-white/5 rounded-xl p-2.5 flex items-center justify-between mb-3.5 select-none animate-in fade-in duration-200">
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-[#5370ff]" />}
                <span>{isAdmin ? 'Admin Master Storage' : 'Personal Drive'}</span>
              </h4>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider">
                {isAdmin ? 'Cloudflare R2 Master' : 'My Private Files'}
              </span>
            </div>
          </div>
        ) : (
          <div className="my-2.5 flex justify-center">
            <div
              title={isAdmin ? 'Admin Master Storage' : 'Personal Drive'}
              className="w-8 h-8 rounded-xl bg-[#1c2759] border border-white/5 flex items-center justify-center text-[#5370ff]"
            >
              {isAdmin ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <span className="text-[10px] font-bold text-white uppercase">PD</span>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4. NAVIGATION LIST (WITH FLOATING HOVER TOOLTIPS IN RAIL MODE) */}
        {/* ------------------------------------------------------------- */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onCloseMobile && onCloseMobile()}
                className={({ isActive }) =>
                  `w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                    isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-[#293879] text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {/* Badge when expanded */}
                    {!isCollapsed && item.badge && (
                      <span className="text-[10px] text-slate-400 font-normal px-1.5 py-0.5 rounded bg-white/10 shrink-0">
                        {item.badge}
                      </span>
                    )}

                    {/* Dot Indicator when collapsed */}
                    {isCollapsed && item.badge && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#4361ee] ring-2 ring-[#141d44]" />
                    )}

                    {/* Floating Tooltip in Rail Mode */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0f172a] text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 bg-[#4361ee] text-white text-[10px] font-bold rounded-full">
                            {item.badge}
                          </span>
                        )}
                        {/* Tooltip caret */}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0f172a]" />
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ------------------------------------------------------------- */}
        {/* 5. CREATE NEW BUTTON                                          */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-3.5">
          {!isCollapsed ? (
            <button
              onClick={onCreateNew}
              className="w-full bg-[#4361ee] hover:bg-[#3652db] text-white font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create new</span>
            </button>
          ) : (
            <div className="relative group flex justify-center">
              <button
                onClick={onCreateNew}
                className="w-9 h-9 rounded-xl bg-[#4361ee] hover:bg-[#3652db] text-white flex items-center justify-center shadow-lg shadow-blue-900/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>

              {/* Floating Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0f172a] text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center">
                <span>Create new</span>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0f172a]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. BOTTOM STORAGE & HELP WIDGET                               */}
      {/* ------------------------------------------------------------- */}
      <div className="pt-3 border-t border-white/10 space-y-2.5">
        {!isCollapsed ? (
          <div>
            <div className="flex items-center space-x-2 text-slate-300 mb-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold">
                {isAdmin ? 'System Storage' : 'My Storage'}
              </span>
            </div>
            <div className="w-full bg-[#243168] h-1.5 rounded-full overflow-hidden mb-1.5">
              <div
                className="bg-[#5370ff] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, (totalStorageMB / 1024) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {totalStorageMB} MB used (Max 10MB/file)
            </p>

            {isAdmin && (
              <NavLink
                to="/settings"
                className="block text-center w-full py-1.5 px-3 rounded-lg border border-slate-600/70 text-slate-200 text-xs font-medium hover:bg-white/5 transition-colors cursor-pointer"
              >
                Manage Storage
              </NavLink>
            )}

            <div className="pt-1.5">
              <button className="flex items-center space-x-2 text-[11px] text-slate-400 hover:text-slate-200 transition-colors w-full cursor-pointer">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Help & getting started</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2.5">
            {/* Collapsed Storage Icon with Tooltip */}
            <div className="relative group cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-[#1c2759] border border-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                <HardDrive className="w-3.5 h-3.5" />
              </div>

              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-2 bg-[#0f172a] text-white text-xs rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                <p className="font-bold">{isAdmin ? 'System Storage' : 'My Storage'}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {totalStorageMB} MB utilized
                </p>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0f172a]" />
              </div>
            </div>

            {/* Collapsed Help Icon with Tooltip */}
            <div className="relative group cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-transparent hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
                <HelpCircle className="w-3.5 h-3.5" />
              </div>
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0f172a] text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                <span>Help & getting started</span>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0f172a]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
