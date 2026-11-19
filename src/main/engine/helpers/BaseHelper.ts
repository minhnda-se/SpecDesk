import { Page } from 'playwright-core';

export class BaseHelper {
  public page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Tiện ích chụp ảnh dùng chung cho mọi file kế thừa
  public async captureEvidence(stepName: string, status: 'PASS' | 'FAIL'): Promise<Buffer> {
    const screenshot = await this.page.screenshot();
    return screenshot;
  }
}
