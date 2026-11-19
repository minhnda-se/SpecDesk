import { ipcMain, BrowserWindow } from 'electron';
import { workspaceService } from '../services/workspace-service.js';
import { watcherService } from '../services/watcher-service.js';

export function registerWorkspaceIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('workspace:selectFolder', async () => {
    const win = getMainWindow();
    const result = await workspaceService.selectFolder(win);
    if (!result.canceled && result.path) {
      watcherService.startWatching(result.path, getMainWindow);
    }
    return result;
  });

  ipcMain.handle('workspace:openFolder', async (_event, folderPath: string) => {
    const result = await workspaceService.openFolder(folderPath);
    if (result.success && result.path) {
      watcherService.startWatching(result.path, getMainWindow);
    }
    return result;
  });

  ipcMain.handle('workspace:getRecent', async () => {
    return workspaceService.getRecentProjects();
  });

  ipcMain.handle('workspace:getActive', async () => {
    return workspaceService.getActiveWorkspace();
  });

  ipcMain.handle('workspace:close', async () => {
    watcherService.stopWatching();
    workspaceService.closeWorkspace();
    return { success: true };
  });

  ipcMain.handle('workspace:removeRecent', async (_event, folderPath: string) => {
    return workspaceService.removeRecentProject(folderPath);
  });

  ipcMain.handle('workspace:deleteFolder', async (_event, folderPath: string) => {
    if (workspaceService.getActiveWorkspace() === folderPath) {
      watcherService.stopWatching();
    }
    return workspaceService.deleteWorkspaceFolder(folderPath);
  });

  ipcMain.handle('workspace:importTemplates', async () => {
    return workspaceService.importBundledTemplates();
  });
}
