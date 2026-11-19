import { useState, useEffect } from 'react';
import {
  X,
  Crosshair,
  Sparkles,
  ExternalLink,
  Check,
  CheckSquare,
  Square,
  Loader2,
  Globe,
  Power,
  RotateCw,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import type { ICapturedElement, IScrapedElement, ISessionStatus } from '../../../../shared/types';

interface ElementPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPageName: string;
  locatorFileName: string;
  availablePages: string[];
  onImportElements: (pageName: string, elements: Record<string, string>) => void;
}

export function ElementPickerModal({
  isOpen,
  onClose,
  targetPageName,
  locatorFileName,
  availablePages,
  onImportElements,
}: ElementPickerModalProps) {
  const [urlInput, setUrlInput] = useState('https://www.saucedemo.com/');
  const [selectedPage, setSelectedPage] = useState(
    targetPageName || availablePages[0] || 'CommonPage'
  );
  const [customPageName, setCustomPageName] = useState('');
  const [isCreatingNewPage, setIsCreatingNewPage] = useState(false);

  // Session state
  const [sessionStatus, setSessionStatus] = useState<ISessionStatus>({
    isConnected: false,
    currentUrl: '',
    currentTitle: '',
    isPickerActive: false,
    targetPage: selectedPage,
  });

  const [isLaunching, setIsLaunching] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedElements, setScrapedElements] = useState<IScrapedElement[]>([]);
  const [selectedScrapedKeys, setSelectedScrapedKeys] = useState<Set<number>>(new Set());
  const [filterQuery, setFilterQuery] = useState('');
  const [lastCapturedElement, setLastCapturedElement] = useState<ICapturedElement | null>(null);

  const effectiveTargetPage = isCreatingNewPage
    ? customPageName.trim() || 'CustomPage'
    : selectedPage;

  // Poll or check initial session status on mount
  useEffect(() => {
    if (!isOpen || !window.electronAPI?.inspector) return;

    window.electronAPI.inspector.getSessionStatus().then((status) => {
      if (status) {
        setSessionStatus(status);
        if (status.currentUrl && !urlInput) {
          setUrlInput(status.currentUrl);
        }
      }
    });

    const unsubStatus = window.electronAPI.inspector.onSessionStatusChanged((status) => {
      setSessionStatus(status);
    });

    const unsubCaptured = window.electronAPI.inspector.onElementCaptured((el) => {
      setLastCapturedElement(el);
      // Automatically add to scraped list so user sees it in table
      setScrapedElements((prev) => {
        const exists = prev.some((item) => item.selector === el.selector);
        if (exists) return prev;
        return [
          {
            elementKey: el.elementKey,
            selector: el.selector,
            tagName: el.tagName,
            text: el.text,
            placeholder: el.placeholder,
          },
          ...prev,
        ];
      });
      setSelectedScrapedKeys((prev) => new Set([...prev, 0]));
      // Also apply directly
      onImportElements(el.targetPage, { [el.elementKey]: el.selector });
    });

    const unsubScraped = window.electronAPI.inspector.onScrapeTriggered((data) => {
      if (data && Array.isArray(data.elements)) {
        setScrapedElements(data.elements);
        setSelectedScrapedKeys(new Set(data.elements.map((_, i) => i)));
      }
    });

    return () => {
      unsubStatus();
      unsubCaptured();
      unsubScraped();
    };
  }, [isOpen, onImportElements]);

  if (!isOpen) return null;

  // Launch or bring to front interactive browser session
  const handleLaunchSession = async () => {
    if (!window.electronAPI?.inspector) return;
    setIsLaunching(true);

    try {
      const res = await window.electronAPI.inspector.launchSession({
        initialUrl: urlInput.trim(),
        targetPage: effectiveTargetPage,
        locatorFile: locatorFileName,
      });

      if (res.success && res.status) {
        setSessionStatus(res.status);
      } else if (!res.success) {
        alert(`Failed to launch browser: ${res.error || 'Unknown error'}`);
      }
    } finally {
      setIsLaunching(false);
    }
  };

  // Close interactive session
  const handleCloseSession = async () => {
    if (!window.electronAPI?.inspector) return;
    await window.electronAPI.inspector.closeSession();
    setSessionStatus({
      isConnected: false,
      currentUrl: '',
      currentTitle: '',
      isPickerActive: false,
      targetPage: effectiveTargetPage,
    });
  };

  // Navigate session to new URL from Studio
  const handleNavigate = async () => {
    if (!window.electronAPI?.inspector || !urlInput.trim()) return;
    await window.electronAPI.inspector.navigateSession(urlInput.trim());
  };

  // Toggle visual element picker on active screen
  const handleTogglePicker = async () => {
    if (!window.electronAPI?.inspector) return;
    const nextState = !sessionStatus.isPickerActive;
    await window.electronAPI.inspector.setPickerMode({
      enabled: nextState,
      targetPage: effectiveTargetPage,
    });
    setSessionStatus((prev) => ({ ...prev, isPickerActive: nextState }));
  };

  // Scrape the currently active screen DOM
  const handleScrapeCurrentScreen = async () => {
    if (!window.electronAPI?.inspector) return;
    setIsScraping(true);

    try {
      const res = await window.electronAPI.inspector.scrapeCurrentScreen();
      if (res.success && res.elements) {
        setScrapedElements(res.elements);
        // Select all by default
        const allIndices = new Set(res.elements.map((_, idx) => idx));
        setSelectedScrapedKeys(allIndices);
        if (res.url) {
          setUrlInput(res.url);
        }
      } else {
        alert(`Scrape failed: ${res.error || 'Unknown error'}`);
      }
    } finally {
      setIsScraping(false);
    }
  };

  // Toggle selection for scraped element
  const handleToggleSelect = (idx: number) => {
    const next = new Set(selectedScrapedKeys);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedScrapedKeys(next);
  };

  // Select/deselect all
  const handleToggleSelectAll = () => {
    if (selectedScrapedKeys.size === filteredElements.length) {
      setSelectedScrapedKeys(new Set());
    } else {
      setSelectedScrapedKeys(new Set(scrapedElements.map((_, i) => i)));
    }
  };

  // Update element key inline
  const handleUpdateElementKey = (idx: number, newKey: string) => {
    const next = [...scrapedElements];
    next[idx] = { ...next[idx], elementKey: newKey.trim() };
    setScrapedElements(next);
  };

  // Import selected elements into target Page Object
  const handleImportSelected = () => {
    const targetPage = effectiveTargetPage;
    const importPayload: Record<string, string> = {};

    scrapedElements.forEach((el, idx) => {
      if (selectedScrapedKeys.has(idx) && el.elementKey && el.selector) {
        importPayload[el.elementKey] = el.selector;
      }
    });

    const count = Object.keys(importPayload).length;
    if (count === 0) {
      alert('Vui lòng chọn ít nhất một element để nhập vào Page Object.');
      return;
    }

    onImportElements(targetPage, importPayload);
    alert(`Đã nhập thành công ${count} locators vào Page "${targetPage}"!`);
    onClose();
  };

  // Filter elements by user search
  const filteredElements = scrapedElements.filter((el) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      el.elementKey.toLowerCase().includes(q) ||
      el.selector.toLowerCase().includes(q) ||
      (el.text && el.text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#090d18] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0c1222]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 shadow-inner">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Interactive Web Inspector &amp; Screen Scraper</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  Live Screen Mode
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tự do mở trình duyệt, đăng nhập, vượt bảo mật/2FA và mở đúng màn hình bạn cần, sau đó cào hoặc pick element trực tiếp.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Browser Interactive Session Controller */}
        <div className="p-4 bg-[#0d1424] border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  sessionStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {sessionStatus.isConnected
                  ? '🟢 Trình duyệt đang kết nối trực tiếp (Live Screen Active)'
                  : '🔴 Chưa mở trình duyệt'}
              </span>
            </div>

            {sessionStatus.isConnected && (
              <button
                type="button"
                onClick={handleCloseSession}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
              >
                <Power className="w-3 h-3" />
                <span>Đóng Trình duyệt</span>
              </button>
            )}
          </div>

          {/* URL & Launch Bar */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nhập địa chỉ web bắt đầu (ví dụ: https://www.saucedemo.com/)..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (sessionStatus.isConnected) {
                      handleNavigate();
                    } else {
                      handleLaunchSession();
                    }
                  }
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#080d1a] border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            {sessionStatus.isConnected ? (
              <button
                type="button"
                onClick={handleNavigate}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer flex items-center space-x-1.5"
                title="Chuyển đến URL này trên trình duyệt"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Điều hướng</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchSession}
                disabled={isLaunching}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20 transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isLaunching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                <span>Mở Trình duyệt Tương tác</span>
              </button>
            )}
          </div>

          {/* Current Screen Live Info */}
          {sessionStatus.isConnected ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <div className="flex items-center space-x-2 truncate">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-semibold text-white">Màn hình hiện tại:</span>
                <span className="text-emerald-400 font-mono truncate max-w-md">
                  {sessionStatus.currentTitle
                    ? `${sessionStatus.currentTitle} • `
                    : ''}
                  {sessionStatus.currentUrl}
                </span>
              </div>
              <span className="text-[11px] text-teal-300/90 font-normal ml-2 shrink-0">
                👉 Kéo thanh web bằng ⠿ hoặc bấm — để thu nhỏ khi bị khuất
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              💡 <strong>Mẹo:</strong> Bấm nút <strong>&quot;Mở Trình duyệt Tương tác&quot;</strong>, sau đó bạn có thể đăng nhập tài khoản thực, nhập mã OTP/2FA, mở các modal hay menu phức tạp rồi quay lại đây bấm cào.
            </p>
          )}
        </div>

        {/* Section 2: Action Bar & Target Page Object */}
        <div className="p-4 bg-[#0a0f1d] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Target Page Selector */}
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-300">Lưu vào Page:</span>

            {isCreatingNewPage ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  placeholder="Tên Page mới (e.g. CheckoutModal)..."
                  value={customPageName}
                  onChange={(e) => setCustomPageName(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-[#0e1628] border border-teal-500 rounded-lg text-teal-200 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setIsCreatingNewPage(false)}
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <select
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value)}
                  className="px-3 py-1 text-xs bg-[#0e1628] border border-slate-700 rounded-lg text-slate-200 font-mono outline-none focus:border-teal-500 cursor-pointer"
                >
                  {availablePages.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewPage(true)}
                  className="px-2 py-1 text-[11px] font-medium text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 border border-dashed border-teal-500/40 rounded-lg transition-colors cursor-pointer"
                >
                  + Tạo Page mới
                </button>
              </div>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center space-x-2">
            {/* Scrape Current Screen */}
            <button
              type="button"
              onClick={handleScrapeCurrentScreen}
              disabled={!sessionStatus.isConnected || isScraping}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Cào toàn bộ nút bấm, ô nhập liệu, liên kết trên màn hình đang mở"
            >
              {isScraping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>⚡ Cào nguyên Screen hiện tại</span>
            </button>

            {/* Toggle Live Picker */}
            <button
              type="button"
              onClick={handleTogglePicker}
              disabled={!sessionStatus.isConnected}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                sessionStatus.isPickerActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-teal-300 border-slate-700'
              }`}
              title="Bật/Tắt chế độ hover và click trực tiếp trên màn hình web để chọn element"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>
                {sessionStatus.isPickerActive
                  ? '🎯 Đang Pick: BẬT (Click trên web)'
                  : '🎯 Bật Pick Element'}
              </span>
            </button>
          </div>
        </div>

        {/* Section 3: Elements Table & Filter */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Danh sách Element ({scrapedElements.length})
              </span>
              {lastCapturedElement && (
                <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <span>Vừa pick:</span>
                  <strong>{lastCapturedElement.elementKey}</strong>
                </span>
              )}
              {scrapedElements.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center space-x-1 text-xs text-teal-400 hover:text-teal-300 cursor-pointer"
                >
                  {selectedScrapedKeys.size === scrapedElements.length ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {selectedScrapedKeys.size === scrapedElements.length
                      ? 'Bỏ chọn tất cả'
                      : `Chọn tất cả (${scrapedElements.length})`}
                  </span>
                </button>
              )}
            </div>

            {scrapedElements.length > 0 && (
              <input
                type="text"
                placeholder="Lọc element..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-56 px-3 py-1 text-xs bg-[#080d1a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 outline-none focus:border-teal-500"
              />
            )}
          </div>

          {/* Table of elements */}
          <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-[#080d18]">
            {filteredElements.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Sparkles className="w-6 h-6 text-slate-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-300">
                    Chưa có element nào được cào
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {sessionStatus.isConnected
                      ? 'Bấm "⚡ Cào nguyên Screen hiện tại" hoặc bật "🎯 Bật Pick Element" và click trực tiếp trên cửa sổ trình duyệt đang mở.'
                      : 'Bấm "Mở Trình duyệt Tương tác" ở trên để bắt đầu thao tác đến màn hình mong muốn.'}
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c1222] border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedScrapedKeys.size === filteredElements.length &&
                          filteredElements.length > 0
                        }
                        onChange={handleToggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="p-3 w-16">Tag</th>
                    <th className="p-3 w-56">Tên Element Key (CamelCase)</th>
                    <th className="p-3">Selector biểu thức</th>
                    <th className="p-3 w-40">Mô tả / Text</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredElements.map((el, idx) => {
                    const isSelected = selectedScrapedKeys.has(idx);
                    return (
                      <tr
                        key={`${el.selector}-${idx}`}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-teal-500/5' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(idx)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-400 uppercase text-[10px]">
                          {el.tagName}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={el.elementKey}
                            onChange={(e) => handleUpdateElementKey(idx, e.target.value)}
                            className="w-full bg-[#080d1a] border border-slate-700/80 rounded px-2 py-1 text-teal-300 font-bold outline-none focus:border-teal-500 text-xs"
                          />
                        </td>
                        <td className="p-3 text-slate-300 text-[11px] truncate max-w-xs" title={el.selector}>
                          <span className="text-slate-400">{el.selector}</span>
                        </td>
                        <td className="p-3 text-slate-400 font-sans text-xs truncate max-w-[150px]">
                          {el.text || el.placeholder || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0c1222] border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Đã chọn <strong className="text-teal-300">{selectedScrapedKeys.size}</strong> element để nhập vào Page <code className="text-white font-mono font-semibold">{effectiveTargetPage}</code>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy / Đóng
            </button>
            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedScrapedKeys.size === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Nhập {selectedScrapedKeys.size} Locators vào Page Object</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
