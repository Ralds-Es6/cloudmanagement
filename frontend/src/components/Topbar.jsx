import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, ShieldCheck, User, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const routeTitles = {
  '/': 'Team Folder',
  '/all-files': 'User Directories',
  '/my-files': 'My Files',
  '/references': 'References',
  '/documents': 'Documents',
  '/favorites': 'Favorites',
  '/recents': 'Recents',
  '/shared': 'Shared with me',
  '/trash': 'Deleted files',
  '/settings': 'Settings',
};

export default function Topbar({ onSearch, activeFolderTitle, onOpenMobileMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  let currentTitle = routeTitles[location.pathname];
  if (!currentTitle && location.pathname.startsWith('/folders/')) {
    currentTitle = activeFolderTitle || 'Folder';
  }
  if (!currentTitle) currentTitle = 'Dashboard';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-8 lg:px-12 flex items-center justify-between sticky top-0 z-20 shrink-0 gap-3">
      {/* Left: Mobile Hamburger + Breadcrumb */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm truncate">
          <span className="text-slate-400 font-medium hidden xs:inline">CloudXen</span>
          <span className="text-slate-300 hidden xs:inline">›</span>
          {location.pathname.startsWith('/folders/') && (
            <>
              <span className="text-slate-400 font-medium hidden sm:inline">Folders</span>
              <span className="text-slate-300 hidden sm:inline">›</span>
            </>
          )}
          <span className="text-slate-800 font-semibold truncate">{currentTitle}</span>
        </div>
      </div>

      {/* Right: Responsive Search + Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            onChange={(e) => onSearch && onSearch(e.target.value)}
            placeholder="Search... ⌘K"
            className="w-32 xs:w-44 sm:w-64 md:w-80 pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee] transition-all"
          />
        </div>

        {/* Notifications (hidden on tiny screens) */}
        <button className="hidden sm:flex relative p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4361ee]" />
        </button>

        {/* User Profile & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center space-x-2 sm:space-x-3 p-1 sm:p-1.5 cursor-pointer select-none rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#ede9fe] text-[#6366f1] font-bold text-xs flex items-center justify-center border border-purple-200/60 shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="hidden md:block text-left">
              <h5 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                {user?.name || 'User'}
              </h5>
              <span className="text-[11px] text-slate-400 capitalize">
                {user?.role ? `${user.role} Account` : 'Account'}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.name || 'Administrator'}
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  {user?.email || 'admin@cloud.local'}
                </p>
                <div className="mt-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#4361ee] text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user?.role || 'admin'}</span>
                </div>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
