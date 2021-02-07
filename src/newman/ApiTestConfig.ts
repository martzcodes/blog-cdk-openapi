export interface ApiTestConfig {
  name: string;
  description?: string;
  path: string;
  method: string;
  status: number;
  pathParams: Record<string, string>;
  body?: any;
  responseValues?: Record<string, string>;
}