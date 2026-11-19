import { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Trash2,
  Save,
  AlertTriangle,
  FileCode,
  FolderOpen,
  LayoutGrid,
  Check,
  Copy,
  Crosshair,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useTabStore } from '../../stores/tab.store';
import { TabBar } from '../layout/TabBar';
import { ElementPickerModal } from './ElementPickerModal';
import type { ILocatorStore } from '../../../../shared/types';

export function LocatorPoolStudio() {
  const { locators: locatorFiles, loadLocators } = useWorkspaceStore();
  const { tabs, activeTabId, openTab, updateActiveData, saveActiveTab } = useTabStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [elementSearch, setElementSearch] = useState('');
  const [isCreateRepoModalOpen, setIsCreateRepoModalOpen] = useState(false);
  const [newRepoFileName, setNewRepoFileName] = useState('');

  // Page management
  const [selectedPage, setSelectedPage] = useState<string>('ALL');
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');

  // New element state
  const [targetPageForElement, setTargetPageForElement] = useState<string>('');
  const [newElementName, setNewElementName] = useState('');
  const [newSelectorValue, setNewSelectorValue] = useState('');

  // Copied feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Picker & Scraper Modal
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [pickerTargetPage, setPickerTargetPage] = useState<string>('');

  const activeTab = tabs.find((t) => t.id === activeTabId && t.type === 'locator');
  const locatorData = (activeTab?.data || {}) as ILocatorStore;

  // Parsed pages structure: { [pageName: string]: Array<{ name: string; value: string }> }
  const parsedPages = useMemo(() => {
    const pages: Record<string, Array<{ name: string; value: string }>> = {};

    for (const [key, val] of Object.entries(locatorData)) {
      if (typeof val === 'object' && val !== null && !('value' in val)) {
        // Nested page
        const elList: Array<{ name: string; value: string }> = [];
        for (const [elName, elVal] of Object.entries(val as Record<string, any>)) {
          const value =
            typeof elVal === 'object' && elVal?.value ? elVal.value : String(elVal ?? '');
          elList.push({ name: elName, value });
        }
        pages[key] = elList;
      } else {
        // Flat element in fallback page
        const defaultPage = activeTab?.title || 'CommonPage';
        if (!pages[defaultPage]) pages[defaultPage] = [];
        const value =
          typeof val === 'object' && (val as any)?.value ? (val as any).value : String(val ?? '');
        pages[defaultPage].push({ name: key, value });
      }
    }

    return pages;
  }, [locatorData, activeTab]);

  const pageNames = useMemo(() => Object.keys(parsedPages), [parsedPages]);

  // Total elements count
  const totalElementsCount = useMemo(() => {
    return Object.values(parsedPages).reduce((acc, list) => acc + list.length, 0);
  }, [parsedPages]);

  // Duplicate Selector Detection across current file
  const duplicateMap = useMemo(() => {
    const selectorOccurrences = new Map<string, string[]>();

    for (const [pageName, elements] of Object.entries(parsedPages)) {
      for (const el of elements) {
        const val = el.value.trim();
        if (!val) continue;
        const list = selectorOccurrences.get(val) || [];
        list.push(`${pageName}.${el.name}`);
        selectorOccurrences.set(val, list);
      }
    }

    const dupes = new Map<string, string[]>();
    for (const [sel, occurrences] of selectorOccurrences.entries()) {
      if (occurrences.length > 1) {
        dupes.set(sel, occurrences);
      }
    }
    return dupes;
  }, [parsedPages]);

  // Add a new Page
  const handleAddPage = () => {
    const pName = newPageName.trim();
    if (!pName) return;

    updateActiveData((prev: ILocatorStore) => {
      const copy = { ...prev };
      if (!copy[pName]) {
        copy[pName] = {};
      }
      return copy;
    });

    setSelectedPage(pName);
    setTargetPageForElement(pName);
    setNewPageName('');
    setIsAddPageModalOpen(false);
  };

  // Delete a Page
  const handleDeletePage = (pageName: string) => {
    const count = parsedPages[pageName]?.length || 0;
    const msg =
      count > 0
        ? `Are you sure you want to delete page "${pageName}" and its ${count} element(s)?`
        : `Delete page "${pageName}"?`;
    if (!window.confirm(msg)) return;

    updateActiveData((prev: ILocatorStore) => {
      const copy = { ...prev };
      delete copy[pageName];
      return copy;
    });

    if (selectedPage === pageName) {
      setSelectedPage('ALL');
    }
  };

  // Add new element strictly under a page with clean string selector
  const handleAddElement = () => {
    const elName = newElementName.trim();
    const selVal = newSelectorValue.trim();
    if (!elName || !selVal) return;

    // Determine target page: explicit selection > current filtered page > first existing page > default page
    let pageToUse = targetPageForElement || (selectedPage !== 'ALL' ? selectedPage : pageNames[0]);
    if (!pageToUse) {
      pageToUse = activeTab?.title || 'CommonPage';
    }

    updateActiveData((prev: ILocatorStore) => {
      const copy = { ...prev };

      // Ensure page object exists
      if (typeof copy[pageToUse] !== 'object' || copy[pageToUse] === null) {
        copy[pageToUse] = {};
      }

      // Store clean string selector
      copy[pageToUse] = {
        ...(copy[pageToUse] as Record<string, any>),
        [elName]: selVal,
      };

      return copy;
    });

    setNewElementName('');
    setNewSelectorValue('');
  };

  // Inline update element selector (clean string)
  const handleUpdateElementSelector = (pageName: string, elementName: string, newVal: string) => {
    updateActiveData((prev: ILocatorStore) => {
      const copy = { ...prev };
      if (copy[pageName] && typeof copy[pageName] === 'object') {
        const pCopy = { ...(copy[pageName] as Record<string, any>) };
        pCopy[elementName] = newVal;
        copy[pageName] = pCopy;
      } else {
        copy[elementName] = newVal;
      }
      return copy;
    });
  };

  // Delete element
  const handleDeleteElement = (pageName: string, elementName: string) => {
    updateActiveData((prev: ILocatorStore) => {
      const copy = { ...prev };
      if (copy[pageName] && typeof copy[pageName] === 'object') {
        const pCopy = { ...(copy[pageName] as Record<string, any>) };
        delete pCopy[elementName];
        copy[pageName] = pCopy;
      } else {
        delete copy[elementName];
      }
      return copy;
    });
  };

  // Copy selector to clipboard
  const handleCopySelector = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Open Element Picker / Scraper modal
  const handleOpenPicker = (pageName?: string) => {
    setPickerTargetPage(
      pageName || (selectedPage !== 'ALL' ? selectedPage : pageNames[0]) || 'CommonPage'
    );
    setIsPickerModalOpen(true);
  };

  // Import captured / scraped elements into current active tab
  const handleImportElements = (pageName: string, elements: Record<string, string>) => {
    updateActiveData((prev: ILocatorStore) => {
      const copy = { ...prev };
      if (typeof copy[pageName] !== 'object' || copy[pageName] === null) {
        copy[pageName] = {};
      }
      copy[pageName] = {
        ...(copy[pageName] as Record<string, any>),
        ...elements,
      };
      return copy;
    });
  };

  // Create new locator file
  const handleCreateLocatorFile = async () => {
    if (!newRepoFileName.trim() || !window.electronAPI) return;
    const fileName = newRepoFileName.trim().endsWith('.json')
      ? newRepoFileName.trim()
      : `${newRepoFileName.trim()}.json`;

    const pageName = fileName.replace(/\.json$/, '');
    const initialData: ILocatorStore = {
      [pageName]: {
        submitButton: 'button[type="submit"]',
        inputField: 'input.form-control',
      },
    };

    const res = await window.electronAPI.locators.save(fileName, initialData);
    if (res.success) {
      await loadLocators();
      await openTab('locator', fileName, initialData);
      setIsCreateRepoModalOpen(false);
      setNewRepoFileName('');
    } else {
      alert(`Failed to create locator file: ${res.error || 'Unknown error'}`);
    }
  };

  const filteredLocatorFiles = locatorFiles.filter((f) =>
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pages to display based on selected filter
  const displayedPages = useMemo(() => {
    const query = elementSearch.toLowerCase().trim();
    const result: Record<string, Array<{ name: string; value: string }>> = {};

    for (const [pageName, elements] of Object.entries(parsedPages)) {
      if (selectedPage !== 'ALL' && selectedPage !== pageName) continue;

      const matchedElements = query
        ? elements.filter(
            (el) =>
              el.name.toLowerCase().includes(query) || el.value.toLowerCase().includes(query)
          )
        : elements;

      if (matchedElements.length > 0 || !query) {
        result[pageName] = matchedElements;
      }
    }

    return result;
  }, [parsedPages, selectedPage, elementSearch]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#090d16]">
      {/* Left Sidebar: Locator Files */}
      <aside className="w-72 bg-[#0a0f1e] border-r border-slate-800/80 flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Locator Repos ({locatorFiles.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateRepoModalOpen(true)}
            title="Create New Locator File"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search locator files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#0e1628] border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredLocatorFiles.map((file) => {
            const isCurrent = activeTabId === `locator:${file}`;
            return (
              <div
                key={file}
                onClick={() => openTab('locator', file)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? 'bg-[#111e33] border-teal-500/50 shadow-md shadow-teal-500/5 text-teal-300'
                    : 'bg-[#0d1424]/60 border-slate-800/60 hover:bg-[#0e162a] hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileCode className="w-4 h-4 shrink-0 text-teal-400" />
                  <span className="text-xs font-mono truncate">{file}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Area: Page & Elements Table */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#080d19]">
        <TabBar />

        {activeTab ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Card Header */}
            <div className="p-4 rounded-2xl bg-[#0d1424] border border-slate-800 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold text-white font-mono">{activeTab.fileName}</span>
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-medium">
                    {pageNames.length} Page{pageNames.length !== 1 ? 's' : ''} • {totalElementsCount} Locators
                  </span>
                  {duplicateMap.size > 0 && (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{duplicateMap.size} Duplicates</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Manage Page Object selectors grouped by Page. Selectors are stored as clean string expressions.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleOpenPicker()}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
                  title="Inspect or scrape elements directly from a live web page"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Pick &amp; Scrape Web</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddPageModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Page</span>
                </button>

                <button
                  type="button"
                  onClick={() => saveActiveTab()}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer ${
                    activeTab.isDirty
                      ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{activeTab.isDirty ? 'Save Changes' : 'Saved'}</span>
                </button>
              </div>
            </div>

            {/* Page Tabs / Filter Strip */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setSelectedPage('ALL')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                    selectedPage === 'ALL'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>All Pages ({pageNames.length})</span>
                </button>

                {pageNames.map((pName) => {
                  const count = parsedPages[pName]?.length || 0;
                  const isSelected = selectedPage === pName;
                  return (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => {
                        setSelectedPage(pName);
                        setTargetPageForElement(pName);
                      }}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="font-mono">{pName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {count}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsAddPageModalOpen(true)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 border border-dashed border-teal-500/30 transition-colors cursor-pointer shrink-0 ml-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Page</span>
                </button>
              </div>

              {/* Element Search Input */}
              <div className="relative w-56 shrink-0 ml-4">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter elements..."
                  value={elementSearch}
                  onChange={(e) => setElementSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#0e1628] border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Quick Add Element Card (Strictly by Page) */}
            <div className="p-4 rounded-xl bg-[#0e1628] border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                  + Add Locator to Page
                </span>
                <span className="text-[11px] text-slate-400">
                  Stored as <code className="text-teal-300 font-mono">&quot;key&quot;: &quot;selector&quot;</code> in Page object
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                {/* Target Page Selector */}
                <div>
                  <select
                    value={targetPageForElement || (selectedPage !== 'ALL' ? selectedPage : pageNames[0] || '')}
                    onChange={(e) => setTargetPageForElement(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#090d18] border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-teal-500 font-mono text-xs"
                  >
                    {pageNames.length === 0 && <option value="CommonPage">CommonPage</option>}
                    {pageNames.map((p) => (
                      <option key={p} value={p}>
                        Page: {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Element Key */}
                <div>
                  <input
                    type="text"
                    placeholder="Element Key (e.g. loginBtn)"
                    value={newElementName}
                    onChange={(e) => setNewElementName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddElement()}
                    className="w-full px-3 py-1.5 bg-[#090d18] border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-teal-500 font-mono text-xs"
                  />
                </div>

                {/* Selector Expression */}
                <div>
                  <input
                    type="text"
                    placeholder="Selector String (e.g. #login-button, .item-name)"
                    value={newSelectorValue}
                    onChange={(e) => setNewSelectorValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddElement()}
                    className="w-full px-3 py-1.5 bg-[#090d18] border border-slate-700 rounded-lg text-slate-200 font-mono text-[11px] outline-none focus:border-teal-500"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleAddElement}
                  disabled={!newElementName.trim() || !newSelectorValue.trim()}
                  className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-lg text-xs shadow-md transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Element</span>
                </button>
              </div>
            </div>

            {/* Elements Tables by Page */}
            {Object.keys(displayedPages).length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-300">No Pages or Locators Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click &quot;Add Page&quot; to create a new page object or add an element using the form above.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPageModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold shadow-lg shadow-teal-500/20 cursor-pointer"
                >
                  Create First Page
                </button>
              </div>
            ) : (
              Object.entries(displayedPages).map(([pageName, elements]) => (
                <div key={pageName} className="space-y-2 bg-[#0c1222] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
                  {/* Page Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                      <span className="font-mono text-sm font-bold text-teal-300">{pageName}</span>
                      <span className="text-[11px] text-slate-400">({elements.length} elements)</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPicker(pageName)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium transition-colors cursor-pointer flex items-center space-x-1"
                        title={`Inspect or scrape elements into ${pageName}`}
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Pick / Scrape</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTargetPageForElement(pageName);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to this page</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePage(pageName)}
                        title={`Delete ${pageName}`}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Elements Table */}
                  {elements.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No elements in this page yet. Use &quot;Add Locator to Page&quot; above to add your first selector.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#0e1628] border-b border-slate-800 text-slate-400">
                            <th className="w-1/3 px-4 py-2 font-medium">Element Key</th>
                            <th className="px-4 py-2 font-medium">Selector Expression</th>
                            <th className="w-20 px-3 py-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          {elements.map((el) => {
                            const isDupe = duplicateMap.has(el.value.trim());
                            const copyId = `${pageName}.${el.name}`;
                            const isCopied = copiedKey === copyId;

                            return (
                              <tr key={el.name} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-2 text-slate-200 font-medium">
                                  <span className="text-teal-400 font-semibold">{el.name}</span>
                                </td>
                                <td className="px-4 py-2 text-slate-300">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={el.value}
                                      onChange={(e) =>
                                        handleUpdateElementSelector(pageName, el.name, e.target.value)
                                      }
                                      className="w-full px-2.5 py-1 bg-transparent hover:bg-slate-800/60 focus:bg-[#090d18] border border-transparent focus:border-teal-500/60 rounded text-slate-200 outline-none font-mono text-xs"
                                    />
                                    {isDupe && (
                                      <span
                                        title={`Identical selector found in: ${duplicateMap.get(el.value.trim())?.join(', ')}`}
                                        className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] shrink-0 font-sans cursor-help"
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>Duplicate</span>
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleCopySelector(copyId, el.value)}
                                      title="Copy selector"
                                      className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer shrink-0"
                                    >
                                      {isCopied ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteElement(pageName, el.name)}
                                    title="Delete element"
                                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
              <FolderOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">No Locator File Open</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select any locator JSON file from the left sidebar to inspect and update Page Object selectors.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateRepoModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              Create Locator File
            </button>
          </div>
        )}
      </main>

      {/* Add Page Modal */}
      {isAddPageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c1222] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Add New Page Object</h3>
                <p className="text-xs text-slate-400">
                  Group selectors logically by Page (e.g. LoginPage, InventoryPage)
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Page Name
              </label>
              <input
                type="text"
                placeholder="e.g. CheckoutPage, NavigationBar"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
                className="w-full px-3 py-2 bg-[#090d18] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddPageModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newPageName.trim()}
                onClick={handleAddPage}
                className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-40 cursor-pointer"
              >
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Locator Repository Modal */}
      {isCreateRepoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c1222] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">New Locator Repository</h3>
                <p className="text-xs text-slate-400">Save as pure JSON in data/locators/</p>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                File Name (JSON)
              </label>
              <input
                type="text"
                placeholder="e.g. swag-lab.json"
                value={newRepoFileName}
                onChange={(e) => setNewRepoFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLocatorFile()}
                className="w-full px-3 py-2 bg-[#090d18] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateRepoModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newRepoFileName.trim()}
                onClick={handleCreateLocatorFile}
                className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-40 cursor-pointer"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Element Picker & Auto-Scraper Modal */}
      {isPickerModalOpen && activeTab && (
        <ElementPickerModal
          isOpen={isPickerModalOpen}
          onClose={() => setIsPickerModalOpen(false)}
          targetPageName={pickerTargetPage}
          locatorFileName={activeTab.fileName}
          availablePages={pageNames}
          onImportElements={handleImportElements}
        />
      )}
    </div>
  );
}


