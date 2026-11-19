import { useState, useMemo, useEffect } from 'react';
import {
  FileCode2,
  Plus,
  Search,
  Trash2,
  Clock,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useTabStore } from '../../stores/tab.store';
import { TabBar } from '../layout/TabBar';
import { ScenarioEditor } from './ScenarioEditor';
import type { LocatorItemMeta, LocatorMapData } from './StepItem';

export function ScenarioStudio() {
  const { scenarios, locators: locatorFiles, activeWorkspace, loadScenarios, importTemplates } = useWorkspaceStore();
  const { tabs, activeTabId, openTab } = useTabStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');

  // Cache of page and element names for autocomplete
  const [locatorMap, setLocatorMap] = useState<LocatorMapData>({});

  // Load locators for autocomplete
  useEffect(() => {
    async function loadLocatorData() {
      if (!window.electronAPI) return;
      try {
        const fileNames = await window.electronAPI.locators.list();
        const map: LocatorMapData = {};

        for (const f of fileNames) {
          try {
            const content = await window.electronAPI.locators.read(f);
            // content can be { PageName: { elName: '...' } } or { elName: '...' }
            for (const [pageOrEl, val] of Object.entries(content || {})) {
              if (typeof val === 'object' && val !== null && !('value' in val)) {
                // Nested page
                const items: LocatorItemMeta[] = [];
                for (const [elKey, elVal] of Object.entries(val as Record<string, any>)) {
                  if (typeof elVal === 'string') {
                    items.push({ name: elKey, selector: elVal });
                  } else if (typeof elVal === 'object' && elVal !== null) {
                    items.push({
                      name: elKey,
                      selector: elVal.value || '',
                      type: elVal.type,
                    });
                  } else {
                    items.push({ name: elKey, selector: String(elVal || '') });
                  }
                }
                map[pageOrEl] = items;
              } else {
                const basePage = f.replace(/\.json$/, '');
                if (!map[basePage]) map[basePage] = [];
                let selector = '';
                let type: string | undefined;
                if (typeof val === 'string') {
                  selector = val;
                } else if (typeof val === 'object' && val !== null) {
                  selector = (val as any).value || '';
                  type = (val as any).type;
                }
                (map[basePage] as LocatorItemMeta[]).push({ name: pageOrEl, selector, type });
              }
            }
          } catch (e) {
            console.warn(`Failed reading locator file ${f}:`, e);
          }
        }
        setLocatorMap(map);
      } catch (err) {
        console.error('Failed fetching locators list:', err);
      }
    }
    loadLocatorData();
  }, [activeWorkspace]);

  const availablePages = useMemo(() => Object.keys(locatorMap), [locatorMap]);

  // Extract all tags from all scenarios
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    scenarios.forEach((s) => (s.tags || []).forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [scenarios]);

  // Filter scenarios
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag =
        selectedTag === 'ALL' || (s.tags || []).includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [scenarios, searchQuery, selectedTag]);

  // Current active tab
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Handle create new scenario
  const handleCreateScenario = async () => {
    if (!newFileName.trim() || !window.electronAPI) return;
    const fileName = newFileName.trim().endsWith('.json')
      ? newFileName.trim()
      : `${newFileName.trim()}.json`;

    const initialLocator = locatorFiles.length > 0 ? locatorFiles[0] : undefined;
    const initialData = {
      name: newScenarioName.trim() || fileName.replace(/\.json$/, ''),
      description: 'Newly created test scenario',
      tags: ['@smoke'],
      config: {
        ...(initialLocator ? { locatorFile: initialLocator } : {}),
      },
      steps: [
        {
          action: 'goto',
          url: 'https://example.com',
        },
      ],
    };

    const res = await window.electronAPI.scenarios.save(fileName, initialData);
    if (res.success) {
      await loadScenarios();
      await openTab('scenario', fileName, initialData);
      setIsCreateModalOpen(false);
      setNewFileName('');
      setNewScenarioName('');
    } else {
      alert(`Failed to create scenario: ${res.error || 'Unknown error'}`);
    }
  };

  // Handle delete scenario
  const handleDeleteScenario = async (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    if (!window.electronAPI) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${fileName}"? This cannot be undone.`
    );
    if (!confirmDelete) return;

    const res = await window.electronAPI.scenarios.delete(fileName);
    if (res.success) {
      await loadScenarios();
    } else {
      alert(`Failed to delete scenario: ${res.error || 'Unknown error'}`);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#090d16]">
      {/* Left Sidebar: Scenario Explorer */}
      <aside className="w-72 bg-[#0a0f1e] border-r border-slate-800/80 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCode2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Scenarios ({scenarios.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            title="Create New Scenario"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Search & Tag Filter */}
        <div className="p-3 border-b border-slate-800/80 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#0e1628] border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Tags Chips */}
          {allTags.length > 0 && (
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pt-1 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedTag('ALL')}
                className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedTag === 'ALL'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                    selectedTag === tag
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scenarios List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredScenarios.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 space-y-3 px-3">
              <p>No test scenarios found in this folder.</p>
              <div className="flex flex-col items-center space-y-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors font-medium cursor-pointer"
                >
                  + Create New Scenario
                </button>
                <button
                  type="button"
                  onClick={() => importTemplates()}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer transition-colors"
                >
                  Load Swag Labs Starter Suite
                </button>
              </div>
            </div>
          ) : (
            filteredScenarios.map((s) => {
              const isCurrent = activeTabId === `scenario:${s.path}`;

              return (
                <div
                  key={s.path}
                  onClick={() => openTab('scenario', s.path)}
                  className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                    isCurrent
                      ? 'bg-[#111a33] border-emerald-500/50 shadow-md shadow-emerald-500/5'
                      : 'bg-[#0d1424]/60 border-slate-800/60 hover:bg-[#0e162a] hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden pr-2">
                    <div className="flex items-center space-x-1.5">
                      <FileCode2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isCurrent ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {s.name}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {s.path}
                    </div>

                    <div className="flex items-center space-x-2 pt-0.5 text-[10px] text-slate-500">
                      <span className="font-mono text-emerald-400 font-semibold">
                        {s.testCaseCount || 1} TC{s.testCaseCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{s.stepCount} steps</span>
                      </span>
                      {(s.tags || []).slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.2 rounded bg-slate-800/90 text-emerald-400 border border-slate-700/60"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteScenario(e, s.path)}
                      title="Delete scenario file"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Center/Right Panel: Tabs & Active Scenario Editor */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#080d19]">
        <TabBar />

        {activeTab && activeTab.type === 'scenario' ? (
          <ScenarioEditor
            key={activeTab.id}
            tab={activeTab}
            availablePages={availablePages}
            locatorMap={locatorMap}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
              <FolderOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">No Scenario Open</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select any scenario from the left sidebar to open its visual step builder, or create a new test suite.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Create New Scenario
            </button>
          </div>
        )}
      </main>

      {/* Create New Scenario Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c1222] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Create New Scenario</h3>
                <p className="text-xs text-slate-400">Save as pure JSON in data/scenarios/</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  File Name (JSON)
                </label>
                <input
                  type="text"
                  placeholder="e.g. checkout-flow.json"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090d18] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Scenario Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer Cart Checkout"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090d18] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newFileName.trim()}
                onClick={handleCreateScenario}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-40 cursor-pointer"
              >
                Create Scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
