import { useState, useEffect } from 'react';
import { X, Search, Plus, Sparkles, Globe, ShieldCheck, Shuffle, Wifi } from 'lucide-react';
import { ACTION_CATEGORIES } from '../../../../shared/constants';
import type { IStep } from '../../../../shared/types';

interface ActionCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStep: (step: Partial<IStep>) => void;
}

export function ActionCatalogDrawer({ isOpen, onClose, onAddStep }: ActionCatalogDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'UI' | 'ASSERTION' | 'API' | 'NETWORK' | 'FLOW'>('ALL');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categoryIcons = {
    UI: <Globe className="w-4 h-4 text-blue-400" />,
    ASSERTION: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    API: <Sparkles className="w-4 h-4 text-purple-400" />,
    NETWORK: <Wifi className="w-4 h-4 text-cyan-400" />,
    FLOW: <Shuffle className="w-4 h-4 text-amber-400" />,
  };

  const getFilteredActions = () => {
    let list: Array<{ action: string; label: string; description: string; category: string }> = [];

    const categories =
      activeCategory === 'ALL'
        ? (['UI', 'ASSERTION', 'API', 'NETWORK', 'FLOW'] as const)
        : ([activeCategory] as const);

    for (const cat of categories) {
      for (const item of ACTION_CATEGORIES[cat]) {
        list.push({ ...item, category: cat });
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.action.toLowerCase().includes(q) ||
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const filtered = getFilteredActions();

  return (
    <>
      {/* Backdrop overlay - click to close */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 transition-opacity cursor-pointer animate-in fade-in duration-150"
        onClick={onClose}
        title="Click anywhere to close"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 w-96 bg-[#0a0f1d] border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1628]">
          <div>
            <h2 className="text-sm font-semibold text-white">Action Catalog</h2>
            <p className="text-[11px] text-slate-400">Click any action to append it to your test</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close Catalog (Esc)"
            className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
          >
            <span>Close</span>
            <X className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/80 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search actions (click, fill, verify...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0e1526] border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1 text-[11px]">
          {(['ALL', 'UI', 'ASSERTION', 'API', 'NETWORK', 'FLOW'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                activeCategory === cat
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Action Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((item) => (
          <div
            key={item.action}
            onClick={() => {
              onAddStep({ action: item.action });
              onClose();
            }}
            className="p-3 rounded-xl bg-[#0e1526] border border-slate-800 hover:border-emerald-500/50 hover:bg-[#121a30] transition-all cursor-pointer group flex items-start justify-between"
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center space-x-2">
                {categoryIcons[item.category as keyof typeof categoryIcons]}
                <span className="font-mono text-xs font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                  {item.action}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {item.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
            </div>
            <div className="w-6 h-6 rounded bg-slate-800/80 text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center transition-all shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
