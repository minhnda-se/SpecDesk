import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import type { IAppInfo } from '../shared/types.js';
import { registerWorkspaceIpc } from './ipc/workspace.ipc.js';
import { registerScenariosIpc } from './ipc/scenarios.ipc.js';
import { registerLocatorsIpc } from './ipc/locators.ipc.js';
import { registerRunnerIpc } from './ipc/runner.ipc.js';
import { registerAiIpc } from './ipc/ai.ipc.js';
import { registerInspectorIpc } from './ipc/inspector.ipc.js';
import { watcherService } from './services/watcher-service.js';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    backgroundColor: '#090d16',
    title: 'SpecDesk',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090d16',
      symbolColor: '#94a3b8',
      height: 38,
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Strict Security Hardening Requirements
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load the remote URL for development or the local html file for production
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function registerAppIpc(): void {
  ipcMain.handle('app:getInfo', async (): Promise<IAppInfo> => {
    return {
      version: app.getVersion(),
      electronVersion: process.versions.electron || 'unknown',
      chromeVersion: process.versions.chrome || 'unknown',
      nodeVersion: process.versions.node || 'unknown',
      platform: process.platform,
    };
  });

  ipcMain.handle('app:minimize', async () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('app:maximize', async () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('app:close', async () => {
    mainWindow?.close();
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.specdesk.app');

  // Default open or close DevTools by F12 in dev
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Register all modular IPC routers
  registerAppIpc();
  registerWorkspaceIpc(() => mainWindow);
  registerScenariosIpc();
  registerLocatorsIpc();
  registerRunnerIpc(() => mainWindow);
  registerAiIpc();
  registerInspectorIpc(() => mainWindow);

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  watcherService.stopWatching();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
