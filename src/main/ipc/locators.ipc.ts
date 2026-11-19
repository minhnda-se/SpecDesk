import { ipcMain } from 'electron';
import type { ILocatorStore } from '../../shared/types.js';
import { fileService } from '../services/file-service.js';

export function registerLocatorsIpc(): void {
  ipcMain.handle('locators:list', async (): Promise<string[]> => {
    return fileService.listLocators();
  });

  ipcMain.handle('locators:read', async (_event, fileName: string): Promise<ILocatorStore> => {
    return fileService.readLocators(fileName);
  });

  ipcMain.handle(
    'locators:save',
    async (
      _event,
      fileName: string,
      data: ILocatorStore
    ): Promise<{ success: boolean; error?: string }> => {
      return fileService.saveLocators(fileName, data);
    }
  );
}
