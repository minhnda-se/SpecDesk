import { ipcMain } from 'electron';
import type { IScenario, IScenarioFileMeta } from '../../shared/types.js';
import { fileService } from '../services/file-service.js';

export function registerScenariosIpc(): void {
  ipcMain.handle('scenarios:list', async (): Promise<IScenarioFileMeta[]> => {
    return fileService.listScenarios();
  });

  ipcMain.handle('scenarios:read', async (_event, fileName: string): Promise<IScenario> => {
    return fileService.readScenario(fileName);
  });

  ipcMain.handle(
    'scenarios:save',
    async (
      _event,
      fileName: string,
      data: IScenario
    ): Promise<{ success: boolean; error?: string }> => {
      return fileService.saveScenario(fileName, data);
    }
  );

  ipcMain.handle(
    'scenarios:delete',
    async (_event, fileName: string): Promise<{ success: boolean; error?: string }> => {
      return fileService.deleteScenario(fileName);
    }
  );
}
