export interface TokenInfo {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface DecodedToken {
  header: any;
  payload: any;
  signature?: string;
}

export interface ApiRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: { [key: string]: string };
}

export interface ApiResponse {
  status: number;
  statusText: string;
  body: any;
  headers: { [key: string]: string };
}
