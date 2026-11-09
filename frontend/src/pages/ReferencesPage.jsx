import React from 'react';
import { Bookmark, ExternalLink, Globe, Layers, BookOpen, Plus, Tag } from 'lucide-react';

export default function ReferencesPage() {
  const references = [
    {
      title: 'Studio Design System Tokens v2.4',
      category: 'Design System',
      description: 'Global typography, color tokens, and Tailwind v4 CSS variables guide.',
      url: 'https://design.studio.internal',
      icon: Layers,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Cloudflare R2 Object Storage Docs',
      category: 'API & Infrastructure',
      description: 'Official API reference for S3-compatible bucket integration and pre-signed URLs.',
      url: 'https://developers.cloudflare.com/r2',
      icon: Globe,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Product Architecture & ERD Spec',
      category: 'Engineering',
      description: 'MongoDB database schema models, relationships, and indexing guidelines.',
      url: 'https://wiki.studio.internal/specs',
      icon: BookOpen,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Brand Assets & Media Guidelines',
      category: 'Brand',
      description: 'Approved logos, vector badges, presentation templates, and icon sets.',
      url: 'https://brand.studio.internal',
      icon: Bookmark,
      color: 'bg-blue-50 text-[#4361ee]',
    },
  ];

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#edf2ff] via-[#f1f5fe] to-[#e8eeff] border border-indigo-100/90 rounded-2xl sm:rounded-3xl p-4.5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 shadow-[0_2px_14px_rgba(67,97,238,0.04)]">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              References & Knowledge
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#e0e7ff] text-[#4361ee]">
              4 Collections
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Curated documentation, design guidelines, and essential team knowledge.
          </p>
        </div>

        <button className="bg-[#4361ee] hover:bg-[#3652db] text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl flex items-center space-x-2 shadow-md shadow-blue-900/10 transition-all cursor-pointer shrink-0">
          <Plus className="w-4 h-4 stroke-[2.2]" />
          <span>Add Reference</span>
        </button>
      </div>

      {/* Reference Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {references.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    {item.category}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                  {item.url}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 text-xs font-semibold text-[#4361ee] hover:text-[#334ed6] cursor-pointer"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

