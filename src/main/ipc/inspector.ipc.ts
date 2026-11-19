import { ipcMain, BrowserWindow } from 'electron';
import { inspectorService } from '../services/inspector-service.js';

export function registerInspectorIpc(getMainWindow: () => BrowserWindow | null): void {
  // Session-based controls
  ipcMain.handle(
    'inspector:launchSession',
    async (
      _event,
      options: { initialUrl?: string; targetPage: string; locatorFile?: string }
    ) => {
      return inspectorService.launchSession(options, getMainWindow);
    }
  );

  ipcMain.handle('inspector:closeSession', async () => {
    return inspectorService.closeSession();
  });

  ipcMain.handle('inspector:navigateSession', async (_event, url: string) => {
    return inspectorService.navigateSession(url);
  });

  ipcMain.handle('inspector:getSessionStatus', async () => {
    return inspectorService.getSessionStatus();
  });

  ipcMain.handle('inspector:scrapeCurrentScreen', async () => {
    return inspectorService.scrapeCurrentScreen();
  });

  ipcMain.handle(
    'inspector:setPickerMode',
    async (_event, options: { enabled: boolean; targetPage: string }) => {
      return inspectorService.setPickerMode(options);
    }
  );

  // Backward compatibility
  ipcMain.handle(
    'inspector:startPicker',
    async (
      _event,
      options: { url: string; targetPage: string; locatorFile?: string }
    ) => {
      return inspectorService.startLivePicker(options, getMainWindow);
    }
  );

  ipcMain.handle('inspector:stopPicker', async () => {
    return inspectorService.stopLivePicker();
  });

  ipcMain.handle('inspector:scrapePage', async (_event, url: string) => {
    return inspectorService.scrapePage(url);
  });
}
