import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import CreateModal from '../components/CreateModal';

export default function AppLayout() {
  const [activeFolderTitle, setActiveFolderTitle] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    defaultFolder: 'Team Folder',
    parentId: null,
    initialTab: 'upload',
  });

  const handleOpenCreate = (options = 'Team Folder') => {
    if (typeof options === 'string') {
      setModalState({
        isOpen: true,
        defaultFolder: options,
        parentId: null,
        initialTab: 'upload',
      });
    } else {
      setModalState({
        isOpen: true,
        defaultFolder: options?.defaultFolder || 'Team Folder',
        parentId: options?.parentId || null,
        initialTab: options?.initialTab || 'upload',
      });
    }
  };

  return (
    <div className="h-screen bg-[#f6f8fc] flex text-slate-800 antialiased font-sans selection:bg-[#4361ee]/20 selection:text-[#4361ee] overflow-hidden">
      {/* Responsive Left Sidebar (Permanent fixed rail/drawer on desktop, never scrolls with page) */}
      <Sidebar
        onCreateNew={() => handleOpenCreate('Team Folder')}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f6f8fc]">
        {/* Dynamic Topbar (Fixed at top of content area) */}
        <Topbar
          activeFolderTitle={activeFolderTitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Dynamic Page Views (Only this container scrolls) */}
        <div className="flex-1 overflow-y-auto">
          <Outlet context={{ openCreate: handleOpenCreate, setActiveFolderTitle }} />
        </div>
      </div>

      {/* Create & Upload Global Modal */}
      <CreateModal
        isOpen={modalState.isOpen}
        defaultFolder={modalState.defaultFolder}
        parentId={modalState.parentId}
        initialTab={modalState.initialTab}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onCreated={() => {
          // Trigger global event so pages can auto-refresh
          window.dispatchEvent(new Event('document-uploaded'));
        }}
      />
    </div>
  );
}

