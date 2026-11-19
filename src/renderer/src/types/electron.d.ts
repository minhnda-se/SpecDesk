import type { IElectronAPI } from '../../../shared/types';

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}

export {};
