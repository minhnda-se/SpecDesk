import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { BrowserWindow } from 'electron';
import type { ICapturedElement, IScrapedElement, ISessionStatus } from '../../shared/types.js';

export class InspectorService {
  private activeBrowser: Browser | null = null;
  private activeContext: BrowserContext | null = null;
  private activePage: Page | null = null;
  private isPickerActive = false;
  private currentTargetPage = 'CommonPage';
  private currentLocatorFile?: string;
  private getMainWindowRef: (() => BrowserWindow | null) | null = null;

  private async launchBrowser(headless: boolean = false): Promise<Browser> {
    const launchOptions = {
      headless,
      slowMo: headless ? 0 : 50,
    };

    const channels = ['chrome', 'msedge', 'chromium'] as const;
    let lastError: any = null;

    for (const channel of channels) {
      try {
        if (channel === 'chromium') {
          return await chromium.launch(launchOptions);
        } else {
          return await chromium.launch({ ...launchOptions, channel });
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw new Error(`Failed to launch browser: ${lastError?.message || 'Unknown error'}`);
  }

  public async launchSession(
    options: { initialUrl?: string; targetPage: string; locatorFile?: string },
    getMainWindow: () => BrowserWindow | null
  ): Promise<{ success: boolean; error?: string; status?: ISessionStatus }> {
    this.getMainWindowRef = getMainWindow;
    this.currentTargetPage = options.targetPage || 'CommonPage';
    this.currentLocatorFile = options.locatorFile;

    try {
      // If already running and active, reuse session
      if (this.activePage && !this.activePage.isClosed()) {
        if (options.initialUrl && options.initialUrl.trim()) {
          let targetUrl = options.initialUrl.trim();
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = `https://${targetUrl}`;
          }
          await this.activePage.goto(targetUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
        }
        await this.activePage.bringToFront().catch(() => {});
        return { success: true, status: await this.getSessionStatus() };
      }

      await this.closeSession();

      this.activeBrowser = await this.launchBrowser(false);
      this.activeContext = await this.activeBrowser.newContext({
        viewport: { width: 1280, height: 800 },
      });

      this.activePage = await this.activeContext.newPage();
      this.isPickerActive = false;

      // Expose binding to capture element from hover/click
      await this.activePage.exposeFunction('__studioCaptureElement', (payload: any) => {
        const win = this.getMainWindowRef?.();
        if (win && !win.isDestroyed()) {
          const fullPayload: ICapturedElement = {
            targetPage: this.currentTargetPage,
            elementKey: payload.elementKey || 'elementKey',
            selector: payload.selector || '',
            tagName: payload.tagName || '',
            text: payload.text || '',
            placeholder: payload.placeholder || '',
            locatorFile: this.currentLocatorFile,
          };
          win.webContents.send('inspector:elementCaptured', fullPayload);
        }
      });

      // Expose binding for in-browser toolbar to trigger scrape
      await this.activePage.exposeFunction('__studioTriggerScrape', async () => {
        if (!this.activePage || this.activePage.isClosed()) return;
        try {
          const elements = await this.activePage.evaluate(scrapeInteractiveElementsCode);
          const url = this.activePage.url();
          const title = await this.activePage.title();
          const win = this.getMainWindowRef?.();
          if (win && !win.isDestroyed()) {
            win.webContents.send('inspector:scrapeTriggered', { elements, url, title });
          }
        } catch (e) {
          console.error('[InspectorService] in-page scrape trigger error:', e);
        }
      });

      // Expose binding for in-browser toolbar to toggle picker
      await this.activePage.exposeFunction('__studioTogglePicker', async (enabled: boolean) => {
        await this.setPickerMode({ enabled, targetPage: this.currentTargetPage });
      });

      // Track navigation and DOM updates
      const notifyStatus = async () => {
        if (!this.activePage || this.activePage.isClosed()) return;
        try {
          const status = await this.getSessionStatus();
          const win = this.getMainWindowRef?.();
          if (win && !win.isDestroyed()) {
            win.webContents.send('inspector:sessionStatusChanged', status);
          }
          // Inject in-page floating toolbar
          await this.injectFloatingToolbar();
          if (this.isPickerActive) {
            await this.injectPickerOverlay();
          }
        } catch {}
      };

      this.activePage.on('framenavigated', (frame) => {
        if (frame === this.activePage?.mainFrame()) {
          notifyStatus();
        }
      });

      this.activePage.on('domcontentloaded', notifyStatus);
      this.activePage.on('load', notifyStatus);

      this.activePage.on('close', () => {
        this.cleanupSession();
      });

      let startUrl = options.initialUrl?.trim() || 'https://www.google.com';
      if (!startUrl.startsWith('http://') && !startUrl.startsWith('https://')) {
        startUrl = `https://${startUrl}`;
      }

      await this.activePage
        .goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        .catch((e) => {
          console.warn('[InspectorService] Initial goto warning:', e);
        });

      await notifyStatus();

      return { success: true, status: await this.getSessionStatus() };
    } catch (err: any) {
      console.error('[InspectorService] launchSession failed:', err);
      await this.closeSession();
      return { success: false, error: err.message };
    }
  }

  public async getSessionStatus(): Promise<ISessionStatus> {
    const isConnected = Boolean(this.activePage && !this.activePage.isClosed());
    if (!isConnected || !this.activePage) {
      return {
        isConnected: false,
        currentUrl: '',
        currentTitle: '',
        isPickerActive: false,
        targetPage: this.currentTargetPage,
      };
    }
    const currentUrl = this.activePage.url();
    let currentTitle = '';
    try {
      currentTitle = await this.activePage.title();
    } catch {}

    return {
      isConnected: true,
      currentUrl,
      currentTitle,
      isPickerActive: this.isPickerActive,
      targetPage: this.currentTargetPage,
    };
  }

  public async navigateSession(url: string): Promise<{ success: boolean; error?: string }> {
    if (!this.activePage || this.activePage.isClosed()) {
      return { success: false, error: 'No active browser session.' };
    }
    try {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }
      await this.activePage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async scrapeCurrentScreen(): Promise<{
    success: boolean;
    elements?: IScrapedElement[];
    url?: string;
    title?: string;
    error?: string;
  }> {
    if (!this.activePage || this.activePage.isClosed()) {
      return {
        success: false,
        error: 'Trình duyệt chưa mở. Vui lòng bấm "Mở Trình duyệt" và điều hướng đến màn hình cần cào.',
      };
    }

    try {
      const elements = await this.activePage.evaluate(scrapeInteractiveElementsCode);
      const url = this.activePage.url();
      const title = await this.activePage.title();
      return { success: true, elements, url, title };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async setPickerMode(options: {
    enabled: boolean;
    targetPage: string;
  }): Promise<{ success: boolean }> {
    this.isPickerActive = options.enabled;
    this.currentTargetPage = options.targetPage || this.currentTargetPage;

    if (!this.activePage || this.activePage.isClosed()) {
      return { success: false };
    }

    try {
      if (options.enabled) {
        await this.activePage
          .evaluate(() => {
            sessionStorage.removeItem('__studio_toolbar_closed');
          })
          .catch(() => {});
        await this.injectPickerOverlay();
      } else {
        await this.removePickerOverlay();
      }

      await this.injectFloatingToolbar();

      const status = await this.getSessionStatus();
      const win = this.getMainWindowRef?.();
      if (win && !win.isDestroyed()) {
        win.webContents.send('inspector:sessionStatusChanged', status);
      }
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  }

  private async injectFloatingToolbar(): Promise<void> {
    if (!this.activePage || this.activePage.isClosed()) return;
    try {
      await this.activePage.evaluate(injectInPageToolbarCode, {
        targetPage: this.currentTargetPage,
        isPickerActive: this.isPickerActive,
      });
    } catch {}
  }

  private async injectPickerOverlay(): Promise<void> {
    if (!this.activePage || this.activePage.isClosed()) return;
    try {
      await this.activePage.evaluate(injectPickerCode, {
        targetPage: this.currentTargetPage,
      });
    } catch {}
  }

  private async removePickerOverlay(): Promise<void> {
    if (!this.activePage || this.activePage.isClosed()) return;
    try {
      await this.activePage.evaluate(() => {
        document.getElementById('__studio_picker_overlay')?.remove();
        document.getElementById('__studio_picker_badge')?.remove();
        (window as any).__studioPickerInjected = false;
      });
    } catch {}
  }

  private cleanupSession(): void {
    this.isPickerActive = false;
    this.activePage = null;
    this.activeContext = null;
    this.activeBrowser = null;
    const win = this.getMainWindowRef?.();
    if (win && !win.isDestroyed()) {
      win.webContents.send('inspector:sessionStatusChanged', {
        isConnected: false,
        currentUrl: '',
        currentTitle: '',
        isPickerActive: false,
        targetPage: this.currentTargetPage,
      });
      win.webContents.send('inspector:pickerClosed');
    }
  }

  public async closeSession(): Promise<void> {
    if (this.activeContext) {
      try {
        await this.activeContext.close();
      } catch {}
    }
    if (this.activeBrowser) {
      try {
        await this.activeBrowser.close();
      } catch {}
    }
    this.cleanupSession();
  }

  // Backward-compatible methods
  public async startLivePicker(options: any, getMainWindow: any) {
    const res = await this.launchSession(options, getMainWindow);
    if (res.success) {
      await this.setPickerMode({ enabled: true, targetPage: options.targetPage });
    }
    return res;
  }

  public async stopLivePicker() {
    return this.closeSession();
  }

  public async scrapePage(url: string) {
    if (this.activePage && !this.activePage.isClosed()) {
      return this.scrapeCurrentScreen();
    }
    let browser: Browser | null = null;
    try {
      browser = await this.launchBrowser(true);
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const scraped = await page.evaluate(scrapeInteractiveElementsCode);
      await browser.close();
      return { success: true, elements: scraped };
    } catch (err: any) {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      return { success: false, error: err.message };
    }
  }
}

// In-page floating toolbar code executed inside browser
function injectInPageToolbarCode({
  targetPage,
  isPickerActive,
}: {
  targetPage: string;
  isPickerActive: boolean;
}) {
  // If user explicitly closed it on this page/session, do not show
  if (sessionStorage.getItem('__studio_toolbar_closed') === 'true') {
    return;
  }

  const existing = document.getElementById('__studio_inpage_toolbar');
  if (existing) {
    const pickerBtn = document.getElementById('__studio_tb_picker_btn');
    if (pickerBtn) {
      pickerBtn.style.background = isPickerActive ? '#059669' : '#1e293b';
      pickerBtn.innerText = isPickerActive ? '🎯 Pick: ON' : '🎯 Pick Element';
    }
    const pageBadge = document.getElementById('__studio_tb_page_badge');
    if (pageBadge) {
      pageBadge.innerText = targetPage;
    }
    const minPageBadge = document.getElementById('__studio_tb_min_page_badge');
    if (minPageBadge) {
      minPageBadge.innerText = targetPage;
    }
    return;
  }

  // Load saved position and minimized state from sessionStorage
  let savedPos: { left?: number; top?: number } = {};
  try {
    savedPos = JSON.parse(sessionStorage.getItem('__studio_toolbar_pos') || '{}');
  } catch {}

  let isMinimized = sessionStorage.getItem('__studio_toolbar_minimized') === 'true';

  const bar = document.createElement('div');
  bar.id = '__studio_inpage_toolbar';
  bar.style.position = 'fixed';
  bar.style.zIndex = '2147483647';
  bar.style.fontFamily =
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  bar.style.fontSize = '12px';
  bar.style.color = '#e2e8f0';
  bar.style.userSelect = 'none';

  const winW = window.innerWidth || 1280;
  const winH = window.innerHeight || 800;
  const initLeft =
    typeof savedPos.left === 'number'
      ? Math.max(8, Math.min(winW - 120, savedPos.left))
      : Math.max(8, winW - 460);
  const initTop =
    typeof savedPos.top === 'number'
      ? Math.max(8, Math.min(winH - 45, savedPos.top))
      : 12;

  bar.style.left = `${initLeft}px`;
  bar.style.top = `${initTop}px`;

  function renderView() {
    if (isMinimized) {
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.gap = '6px';
      bar.style.background = 'rgba(10, 15, 30, 0.95)';
      bar.style.backdropFilter = 'blur(10px)';
      bar.style.border = '1px solid #0d9488';
      bar.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
      bar.style.padding = '4px 10px';
      bar.style.borderRadius = '20px';
      bar.style.cursor = 'grab';

      bar.innerHTML = `
        <div id="__studio_tb_drag_handle" style="cursor:grab;color:#64748b;font-size:14px;letter-spacing:-1px;display:flex;align-items:center;line-height:1;" title="Drag to reposition">⠿</div>
        <span style="width:7px;height:7px;border-radius:50%;background:#10b981;display:inline-block;box-shadow:0 0 6px #10b981;"></span>
        <span id="__studio_tb_min_title" style="font-weight:700;color:#5eead4;font-size:11px;cursor:pointer;" title="Click to expand full toolbar">⚡ Studio</span>
        <span id="__studio_tb_min_page_badge" style="background:#1e293b;color:#94a3b8;padding:1px 6px;border-radius:4px;font-size:10px;font-family:monospace;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${targetPage}</span>
        <button id="__studio_tb_expand_btn" style="background:transparent;border:none;color:#5eead4;cursor:pointer;padding:2px 4px;font-size:12px;line-height:1;border-radius:4px;" title="Expand full toolbar">⛶</button>
      `;
    } else {
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.gap = '8px';
      bar.style.background = 'rgba(10, 15, 30, 0.95)';
      bar.style.backdropFilter = 'blur(10px)';
      bar.style.border = '1px solid #0d9488';
      bar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.7)';
      bar.style.padding = '6px 12px';
      bar.style.borderRadius = '12px';
      bar.style.cursor = 'default';

      bar.innerHTML = `
        <div id="__studio_tb_drag_handle" style="cursor:grab;color:#64748b;font-size:14px;letter-spacing:-1px;display:flex;align-items:center;line-height:1;padding-right:2px;" title="Drag to reposition">⠿</div>
        <div style="display:flex;align-items:center;gap:6px;padding-right:6px;border-right:1px solid #334155;">
          <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;box-shadow:0 0 8px #10b981;"></span>
          <span style="font-weight:700;color:#5eead4;font-size:11px;">Studio</span>
          <span id="__studio_tb_page_badge" style="background:#1e293b;color:#94a3b8;padding:2px 6px;border-radius:4px;font-size:10px;font-family:monospace;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${targetPage}</span>
        </div>
        <button id="__studio_tb_picker_btn" style="background:${isPickerActive ? '#059669' : '#1e293b'};color:white;border:1px solid #334155;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:background 0.15s ease;">
          ${isPickerActive ? '🎯 Pick: ON' : '🎯 Pick Element'}
        </button>
        <button id="__studio_tb_scrape_btn" style="background:#0d9488;color:#042f2e;font-weight:700;border:none;padding:4px 10px;border-radius:8px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;transition:opacity 0.15s ease;">
          ⚡ Scrape Screen
        </button>
        <div style="display:flex;align-items:center;gap:2px;padding-left:4px;border-left:1px solid #334155;">
          <button id="__studio_tb_min_btn" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:13px;line-height:1;font-weight:bold;" title="Minimize toolbar">—</button>
          <button id="__studio_tb_close_btn" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:12px;line-height:1;" title="Hide toolbar from page">✕</button>
        </div>
      `;
    }

    // Clamp position within viewport after rerender
    requestAnimationFrame(() => {
      const rect = bar.getBoundingClientRect();
      const currentWinW = window.innerWidth || 1280;
      const currentWinH = window.innerHeight || 800;
      let curLeft = rect.left;
      let curTop = rect.top;

      if (curLeft + rect.width > currentWinW - 8) {
        curLeft = Math.max(8, currentWinW - rect.width - 8);
      }
      if (curTop + rect.height > currentWinH - 8) {
        curTop = Math.max(8, currentWinH - rect.height - 8);
      }
      bar.style.left = `${curLeft}px`;
      bar.style.top = `${curTop}px`;
    });
  }

  // Delegated Click Handler on bar (bulletproof, works across all innerHTML re-renders)
  bar.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    // 1. Pick Element button
    const pickerBtn = target.closest('#__studio_tb_picker_btn') as HTMLButtonElement | null;
    if (pickerBtn) {
      e.preventDefault();
      e.stopPropagation();
      const isNowActive = pickerBtn.innerText.includes('ON');
      pickerBtn.innerText = !isNowActive ? '🎯 Pick: ON' : '🎯 Pick Element';
      pickerBtn.style.background = !isNowActive ? '#059669' : '#1e293b';
      if (typeof (window as any).__studioTogglePicker === 'function') {
        (window as any).__studioTogglePicker(!isNowActive);
      }
      return;
    }

    // 2. Scrape Screen button
    const scrapeBtn = target.closest('#__studio_tb_scrape_btn') as HTMLButtonElement | null;
    if (scrapeBtn) {
      e.preventDefault();
      e.stopPropagation();
      scrapeBtn.innerText = '⏳ Scraping...';
      scrapeBtn.style.opacity = '0.7';
      if (typeof (window as any).__studioTriggerScrape === 'function') {
        (window as any).__studioTriggerScrape();
        setTimeout(() => {
          scrapeBtn.innerText = '✅ Scraped!';
          setTimeout(() => {
            scrapeBtn.innerText = '⚡ Scrape Screen';
            scrapeBtn.style.opacity = '1';
          }, 1200);
        }, 500);
      }
      return;
    }

    // 3. Minimize button
    const minBtn = target.closest('#__studio_tb_min_btn');
    if (minBtn) {
      e.preventDefault();
      e.stopPropagation();
      isMinimized = true;
      try {
        sessionStorage.setItem('__studio_toolbar_minimized', 'true');
      } catch {}
      renderView();
      return;
    }

    // 4. Expand button or title click (when minimized)
    const expandBtn =
      target.closest('#__studio_tb_expand_btn') || target.closest('#__studio_tb_min_title');
    if (expandBtn) {
      e.preventDefault();
      e.stopPropagation();
      isMinimized = false;
      try {
        sessionStorage.setItem('__studio_toolbar_minimized', 'false');
      } catch {}
      renderView();
      return;
    }

    // 5. Close button
    const closeBtn = target.closest('#__studio_tb_close_btn');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      bar.remove();
      try {
        sessionStorage.setItem('__studio_toolbar_closed', 'true');
      } catch {}
      return;
    }
  });

  // Attach Drag Event Handlers
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  bar.addEventListener('mousedown', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('#__studio_tb_min_title') ||
      target.closest('#__studio_tb_min_btn') ||
      target.closest('#__studio_tb_close_btn') ||
      target.closest('#__studio_tb_expand_btn')
    ) {
      return;
    }

    isDragging = true;
    const rect = bar.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    bar.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    const currentWinW = window.innerWidth || 1280;
    const currentWinH = window.innerHeight || 800;
    const barW = bar.offsetWidth || 200;
    const barH = bar.offsetHeight || 36;

    newLeft = Math.max(8, Math.min(currentWinW - barW - 8, newLeft));
    newTop = Math.max(8, Math.min(currentWinH - barH - 8, newTop));

    bar.style.left = `${newLeft}px`;
    bar.style.top = `${newTop}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    bar.style.cursor = isMinimized ? 'grab' : 'default';
    const rect = bar.getBoundingClientRect();
    try {
      sessionStorage.setItem(
        '__studio_toolbar_pos',
        JSON.stringify({ left: rect.left, top: rect.top })
      );
    } catch {}
  });

  // First attach bar to DOM, then render content
  document.body.appendChild(bar);
  renderView();
}

// Injected code for interactive element picker overlay
function injectPickerCode({ targetPage }: { targetPage: string }) {
  if ((window as any).__studioPickerInjected) return;
  (window as any).__studioPickerInjected = true;

  // Create Highlight Overlay
  const overlay = document.createElement('div');
  overlay.id = '__studio_picker_overlay';
  overlay.style.position = 'fixed';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '2147483645';
  overlay.style.border = '2px solid #14b8a6';
  overlay.style.background = 'rgba(20, 184, 166, 0.15)';
  overlay.style.borderRadius = '4px';
  overlay.style.display = 'none';
  overlay.style.transition = 'all 0.05s ease';
  document.body.appendChild(overlay);

  // Create Info Tooltip Badge
  const badge = document.createElement('div');
  badge.id = '__studio_picker_badge';
  badge.style.position = 'fixed';
  badge.style.zIndex = '2147483646';
  badge.style.pointerEvents = 'none';
  badge.style.background = '#090d16';
  badge.style.color = '#e2e8f0';
  badge.style.border = '1px solid #14b8a6';
  badge.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
  badge.style.padding = '4px 10px';
  badge.style.borderRadius = '6px';
  badge.style.fontSize = '11px';
  badge.style.fontFamily = 'monospace';
  badge.style.display = 'none';
  badge.style.whiteSpace = 'nowrap';
  document.body.appendChild(badge);

  function toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((word, idx) =>
        idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }

  function getOptimalSelector(el: HTMLElement): string {
    if (el.hasAttribute('data-test')) return `[data-test='${el.getAttribute('data-test')}']`;
    if (el.hasAttribute('data-testid')) return `[data-testid='${el.getAttribute('data-testid')}']`;
    if (el.hasAttribute('data-cy')) return `[data-cy='${el.getAttribute('data-cy')}']`;

    if (el.id && !/^[0-9]+$/.test(el.id) && !/^react-|ember\d+/i.test(el.id)) {
      return `#${el.id}`;
    }

    const tag = el.tagName.toLowerCase();
    const name = el.getAttribute('name');
    if (name && ['input', 'select', 'textarea'].includes(tag)) {
      return `${tag}[name='${name}']`;
    }

    const placeholder = el.getAttribute('placeholder');
    if (placeholder && ['input', 'textarea'].includes(tag)) {
      return `${tag}[placeholder='${placeholder}']`;
    }

    const btnText = (el.innerText || '').trim();
    if (tag === 'button' && btnText && btnText.length < 25 && !btnText.includes('\n')) {
      return `button:has-text("${btnText}")`;
    }

    if (el.className && typeof el.className === 'string') {
      const classes = el.className
        .split(/\s+/)
        .filter((c) => c && !c.includes(':') && !c.includes('/') && !c.includes('['));
      if (classes.length > 0) {
        const sel = `.${classes.slice(0, 2).join('.')}`;
        try {
          if (document.querySelectorAll(sel).length === 1) return sel;
        } catch {}
      }
    }

    return tag;
  }

  function getSuggestedKey(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const dataTest = el.getAttribute('data-test') || el.getAttribute('data-testid');
    if (dataTest) {
      const base = toCamelCase(dataTest);
      return tag === 'button' && !base.endsWith('Btn') ? `${base}Btn` : base;
    }

    if (el.id && !/^[0-9]+$/.test(el.id)) {
      const base = toCamelCase(el.id);
      return tag === 'button' && !base.endsWith('Btn') ? `${base}Btn` : base;
    }

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      return `${toCamelCase(placeholder)}Input`;
    }

    const name = el.getAttribute('name');
    if (name) {
      return `${toCamelCase(name)}${tag === 'input' ? 'Input' : ''}`;
    }

    const text = (el.innerText || '').trim();
    if (tag === 'button' && text && text.length < 25) {
      return `${toCamelCase(text)}Btn`;
    }
    if (tag === 'a' && text && text.length < 25) {
      return `${toCamelCase(text)}Link`;
    }

    return `${tag}Element`;
  }

  // Hover listener
  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target as HTMLElement;
      if (
        !target ||
        target === overlay ||
        target === badge ||
        target.closest('#__studio_inpage_toolbar')
      )
        return;

      const rect = target.getBoundingClientRect();
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.display = 'block';

      const key = getSuggestedKey(target);
      const sel = getOptimalSelector(target);

      badge.innerHTML = `<span style="color:#5eead4;font-weight:bold">${key}</span>: <span style="color:#94a3b8">${sel}</span>`;
      badge.style.top = `${Math.max(10, rect.top - 28)}px`;
      badge.style.left = `${rect.left}px`;
      badge.style.display = 'block';
    },
    true
  );

  // Click listener
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement;
      if (
        !target ||
        target === overlay ||
        target === badge ||
        target.closest('#__studio_inpage_toolbar')
      )
        return;

      e.preventDefault();
      e.stopPropagation();

      const key = getSuggestedKey(target);
      const sel = getOptimalSelector(target);

      // Visual success pulse
      overlay.style.border = '2px solid #10b981';
      overlay.style.background = 'rgba(16, 185, 129, 0.4)';
      badge.innerHTML = `<span style="color:#10b981;font-weight:bold">✅ Captured! ${key}</span>`;

      setTimeout(() => {
        overlay.style.border = '2px solid #14b8a6';
        overlay.style.background = 'rgba(20, 184, 166, 0.15)';
      }, 500);

      // Send to Electron Studio
      if ((window as any).__studioCaptureElement) {
        (window as any).__studioCaptureElement({
          targetPage,
          elementKey: key,
          selector: sel,
          tagName: target.tagName.toLowerCase(),
          text: (target.innerText || '').slice(0, 40),
          placeholder: target.getAttribute('placeholder') || undefined,
        });
      }
    },
    true
  );
}

// Scrape entire page DOM code executed in browser
function scrapeInteractiveElementsCode(): IScrapedElement[] {
  const elements: IScrapedElement[] = [];
  const seenSelectors = new Set<string>();

  function toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((word, idx) =>
        idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }

  function getOptimalSelector(el: HTMLElement): string {
    if (el.hasAttribute('data-test')) return `[data-test='${el.getAttribute('data-test')}']`;
    if (el.hasAttribute('data-testid')) return `[data-testid='${el.getAttribute('data-testid')}']`;
    if (el.hasAttribute('data-cy')) return `[data-cy='${el.getAttribute('data-cy')}']`;

    if (el.id && !/^[0-9]+$/.test(el.id) && !/^react-|ember\d+/i.test(el.id)) {
      return `#${el.id}`;
    }

    const tag = el.tagName.toLowerCase();
    const name = el.getAttribute('name');
    if (name && ['input', 'select', 'textarea'].includes(tag)) {
      return `${tag}[name='${name}']`;
    }

    const placeholder = el.getAttribute('placeholder');
    if (placeholder && ['input', 'textarea'].includes(tag)) {
      return `${tag}[placeholder='${placeholder}']`;
    }

    const btnText = (el.innerText || '').trim();
    if (tag === 'button' && btnText && btnText.length < 25 && !btnText.includes('\n')) {
      return `button:has-text("${btnText}")`;
    }

    if (el.className && typeof el.className === 'string') {
      const classes = el.className
        .split(/\s+/)
        .filter((c) => c && !c.includes(':') && !c.includes('/') && !c.includes('['));
      if (classes.length > 0) {
        const sel = `.${classes.slice(0, 2).join('.')}`;
        try {
          if (document.querySelectorAll(sel).length === 1) return sel;
        } catch {}
      }
    }

    return tag;
  }

  function getSuggestedKey(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const dataTest = el.getAttribute('data-test') || el.getAttribute('data-testid');
    if (dataTest) {
      const base = toCamelCase(dataTest);
      return tag === 'button' && !base.endsWith('Btn') ? `${base}Btn` : base;
    }

    if (el.id && !/^[0-9]+$/.test(el.id)) {
      const base = toCamelCase(el.id);
      return tag === 'button' && !base.endsWith('Btn') ? `${base}Btn` : base;
    }

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      return `${toCamelCase(placeholder)}Input`;
    }

    const name = el.getAttribute('name');
    if (name) {
      return `${toCamelCase(name)}${tag === 'input' ? 'Input' : ''}`;
    }

    const text = (el.innerText || '').trim();
    if (tag === 'button' && text && text.length < 25) {
      return `${toCamelCase(text)}Btn`;
    }
    if (tag === 'a' && text && text.length < 25) {
      return `${toCamelCase(text)}Link`;
    }

    return `${tag}Element`;
  }

  const query =
    'button, input, select, textarea, a[href], [role="button"], [data-test], [data-testid]';
  const nodes = Array.from(document.querySelectorAll(query)) as HTMLElement[];

  for (const node of nodes) {
    if (node.closest('#__studio_inpage_toolbar')) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const sel = getOptimalSelector(node);
    if (!sel || seenSelectors.has(sel)) continue;
    seenSelectors.add(sel);

    const key = getSuggestedKey(node);
    const tag = node.tagName.toLowerCase();
    const text = (node.innerText || '').trim().slice(0, 40);
    const placeholder = node.getAttribute('placeholder') || undefined;
    const type = node.getAttribute('type') || undefined;

    elements.push({
      elementKey: key,
      selector: sel,
      tagName: tag,
      text: text || undefined,
      placeholder,
      type,
    });
  }

  return elements;
}

export const inspectorService = new InspectorService();
