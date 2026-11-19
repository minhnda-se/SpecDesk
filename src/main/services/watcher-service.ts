import { BrowserWindow } from 'electron';
import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { fileService } from './file-service.js';

export interface IFileChangeEvent {
  event: 'add' | 'change' | 'unlink';
  path: string;
  relativePath: string;
  category: 'scenario' | 'locator' | 'flow' | 'other';
}

export class WatcherService {
  private watcher: FSWatcher | null = null;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private getWindow: (() => BrowserWindow | null) | null = null;

  public startWatching(
    workspacePath: string,
    getWindow: () => BrowserWindow | null
  ): void {
    this.stopWatching();
    this.getWindow = getWindow;

    const dataDir = path.join(workspacePath, 'data');

    this.watcher = chokidar.watch(workspacePath, {
      ignored: [
        /(^|[/\\])\../, // ignore dotfiles (.git, .vscode, etc.)
        /\.tmp.*/,      // ignore atomic temp files
        /node_modules/,
        /dist-release/,
        /reports/,
        /out/,
      ],
      depth: 4,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 50,
      },
    });

    const handleEvent = (event: 'add' | 'change' | 'unlink', filePath: string) => {
      if (!filePath.endsWith('.json')) return;
      if (fileService.isSelfWritten(filePath)) {
        return;
      }

      // Debounce events for the same file (150ms)
      const existingTimer = this.debounceTimers.get(filePath);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(filePath);
        this.notifyRenderer(event, filePath, workspacePath);
      }, 150);

      this.debounceTimers.set(filePath, timer);
    };

    this.watcher
      .on('add', (filePath) => handleEvent('add', filePath))
      .on('change', (filePath) => handleEvent('change', filePath))
      .on('unlink', (filePath) => handleEvent('unlink', filePath))
      .on('error', (error) => console.error('[WatcherService] Error:', error));

    console.log(`[WatcherService] Started watching workspace: ${workspacePath}`);
  }

  public stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private notifyRenderer(
    event: 'add' | 'change' | 'unlink',
    filePath: string,
    workspacePath: string
  ): void {
    const win = this.getWindow ? this.getWindow() : null;
    if (!win || win.isDestroyed()) return;

    const rel = path.relative(workspacePath, filePath).replace(/\\/g, '/');
    let category: 'scenario' | 'locator' | 'flow' | 'other' = 'other';

    if (rel.includes('locator') || rel.includes('page')) {
      category = 'locator';
    } else if (rel.includes('flow')) {
      category = 'flow';
    } else if (rel.endsWith('.json')) {
      category = 'scenario';
    }

    const payload: IFileChangeEvent = {
      event,
      path: filePath,
      relativePath: rel,
      category,
    };

    console.log(`[WatcherService] Broadcast change: [${event}] ${rel}`);
    win.webContents.send('workspace:fileChanged', payload);
  }
}

export const watcherService = new WatcherService();
