import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import FolderBanner from '../components/FolderBanner';
import TabsNav from '../components/TabsNav';
import ProjectFolders from '../components/ProjectFolders';
import PinnedFiles from '../components/PinnedFiles';
import PeopleWidget from '../components/PeopleWidget';
import PrivacyWidget from '../components/PrivacyWidget';
import InviteModal from '../components/InviteModal';

export default function TeamFolderPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const context = useOutletContext();

  return (
    <main className="px-6 sm:px-10 lg:px-12 py-7 w-full">
      {/* Hero Folder Header Banner */}
      <FolderBanner onInviteClick={() => setIsInviteOpen(true)} />

      {/* Sub Navigation Tabs */}
      <TabsNav />

      {/* Two-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 xl:gap-8 items-start">
        {/* Primary Content (Left ~68%) */}
        <div className="lg:col-span-8 space-y-7 xl:space-y-8">
          <ProjectFolders
            onNewFolderClick={() =>
              context?.openCreate &&
              context.openCreate({
                defaultFolder: 'Team Folder',
                parentId: null,
                initialTab: 'folder',
              })
            }
          />
          <PinnedFiles />
        </div>

        {/* Right Aside Widgets (Right ~32%) */}
        <aside className="lg:col-span-4 space-y-5">
          <PeopleWidget />
          <PrivacyWidget />
        </aside>
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </main>
  );
}

