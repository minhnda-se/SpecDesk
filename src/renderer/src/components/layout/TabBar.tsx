import { X, FileCode2, Layers, Save } from 'lucide-react';
import { useTabStore } from '../../stores/tab.store';

export function TabBar() {
  const { tabs, activeTabId, setActiveTabId, closeTab, saveActiveTab } = useTabStore();

  if (tabs.length === 0) return null;

  const currentTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-9 bg-[#0b101c] border-b border-slate-800/80 flex items-center justify-between px-2 text-xs select-none">
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar max-w-4xl">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center space-x-2 px-3 py-1.5 rounded-t-md cursor-pointer border-t-2 transition-all ${
                isActive
                  ? 'bg-[#0e1526] border-emerald-500 text-slate-100 font-medium'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.type === 'scenario' ? (
                <FileCode2 className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              ) : (
                <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
              )}
              <span className="truncate max-w-[140px]">{tab.title}</span>

              {tab.isDirty ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
              ) : null}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-slate-700/60 hover:text-rose-400 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {currentTab && (
        <div className="flex items-center space-x-2 pl-2">
          {currentTab.isDirty && (
            <button
              onClick={() => saveActiveTab()}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 transition-colors font-medium cursor-pointer"
              title="Save current file (Ctrl+S)"
            >
              <Save className="w-3 h-3" />
              <span>Save (Ctrl+S)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
