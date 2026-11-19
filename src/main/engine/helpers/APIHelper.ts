import { APIRequestContext } from 'playwright-core';

export class APIHelper {
  private request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async post(url: string, data: any, headers?: any) {
    const response = await this.request.post(url, { data, headers });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok()) throw new Error(`API POST thất bại với mã lỗi ${response.status()}`);
    return responseBody;
  }

  async get(url: string, headers?: any) {
    const response = await this.request.get(url, { headers });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok()) throw new Error(`API GET thất bại với mã lỗi ${response.status()}`);
    return responseBody;
  }

  async put(url: string, data: any, headers?: any) {
    const response = await this.request.put(url, { data, headers });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok()) throw new Error(`API PUT failed with status code ${response.status()}`);
    return responseBody;
  }

  async patch(url: string, data: any, headers?: any) {
    const response = await this.request.patch(url, { data, headers });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok()) throw new Error(`API PATCH failed with status code ${response.status()}`);
    return responseBody;
  }

  async delete(url: string, headers?: any) {
    const response = await this.request.delete(url, { headers });
    if (!response.ok()) throw new Error(`API DELETE thất bại với mã lỗi ${response.status()}`);
  }
}
