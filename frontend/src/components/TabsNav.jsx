import React, { useState, useEffect } from 'react';
import { getDocuments } from '../services/api';

export default function TabsNav() {
  const [activeTab, setActiveTab] = useState('Files');
  const [fileCount, setFileCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await getDocuments({ isDeleted: false });
      if (res.data) {
        setFileCount(res.data.length);
      }
    } catch (err) {
      console.warn('Could not fetch tabs count:', err.message);
    }
  };

  useEffect(() => {
    fetchCount();
    const handleRefresh = () => fetchCount();
    window.addEventListener('document-uploaded', handleRefresh);
    return () => window.removeEventListener('document-uploaded', handleRefresh);
  }, []);

  const tabs = [
    { id: 'Files', label: 'Files', count: fileCount },
    { id: 'Activity', label: 'Activity' },
    { id: 'Members', label: 'Members' },
    { id: 'Folder settings', label: 'Folder settings' },
  ];

  return (
    <div className="border-b border-slate-200 mb-7">
      <div className="flex space-x-8 sm:space-x-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3.5 text-xs sm:text-sm font-semibold relative transition-colors cursor-pointer ${
                isActive ? 'text-[#4361ee]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && <span className="ml-1.5">({tab.count})</span>}
              {isActive && (
                <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#4361ee] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
