import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function PeopleWidget() {
  const { user, isAdmin } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const currentUserName = user?.name || (isAdmin ? 'System Administrator' : 'Gerald Quinto');

  const members = [
    {
      name: currentUserName,
      role: isAdmin ? 'You · Workspace Admin' : 'You · Workspace Member',
      status: 'Owner',
      initials: getInitials(currentUserName),
      avatarBg: 'bg-[#ede9fe] text-[#6366f1] border-purple-200/60',
    },
    {
      name: 'Hilya Nur',
      role: 'Studio team',
      status: 'Editor',
      initials: 'HN',
      avatarBg: 'bg-emerald-100 text-emerald-700 border-emerald-200/60',
    },
    {
      name: 'Yahya Adit',
      role: 'Studio team',
      status: 'Editor',
      initials: 'YA',
      avatarBg: 'bg-amber-100 text-amber-700 border-amber-200/60',
    },
    {
      name: 'Arfan Hafiz',
      role: 'Studio team',
      status: 'Viewer',
      initials: 'AH',
      avatarBg: 'bg-purple-100 text-purple-700 border-purple-200/60',
    },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">People</h3>
        <button className="text-xs text-[#4361ee] hover:text-[#334ed6] font-semibold cursor-pointer">
          Manage
        </button>
      </div>

      {/* Member List */}
      <div className="space-y-4">
        {members.map((member) => (
          <div key={member.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${member.avatarBg}`}
              >
                {member.initials}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                  {member.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{member.role}</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {member.status}
            </span>
          </div>
        ))}
      </div>

      {/* View More Link */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <button className="text-xs text-[#4361ee] hover:text-[#334ed6] font-semibold cursor-pointer">
          + 4 more members
        </button>
      </div>
    </div>
  );
}
