import React, { useState, useEffect } from 'react';
import { Plus, Folder as FolderIcon, Loader2 } from 'lucide-react';
import { getFolders } from '../services/api';
import FolderCard from './FolderCard';

export default function ProjectFolders({ onNewFolderClick }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const res = await getFolders();
      if (res.data) {
        setFolders(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch folders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    const handleRefresh = () => fetchFolders();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Project folders ({folders.length})
        </h2>
        <button
          onClick={onNewFolderClick}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New folder</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#4361ee]" />
          <span className="text-xs">Loading folders...</span>
        </div>
      ) : folders.length === 0 ? (
        <div
          onClick={onNewFolderClick}
          className="border-2 border-dashed border-slate-200 hover:border-[#4361ee] bg-white/70 hover:bg-white rounded-2xl p-6 text-center transition-all cursor-pointer shadow-2xs group"
        >
          <FolderIcon className="w-8 h-8 text-slate-300 group-hover:text-[#4361ee] mx-auto mb-2 transition-colors" />
          <p className="text-xs font-bold text-slate-700">No project folders yet</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Click here or '+ New folder' to create your first organized folder.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {folders.map((folder) => (
            <FolderCard
              key={folder._id}
              folder={folder}
              onFolderUpdated={fetchFolders}
            />
          ))}
        </div>
      )}
    </section>
  );
}
