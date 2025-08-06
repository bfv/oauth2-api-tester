export type OAuthProvider = 'keycloak' | 'entra';

export interface KeycloakConfig {
  issuer: string;
  clientId: string;
  redirectUri?: string;
  scope?: string;
}

export interface EntraConfig {
  tenantId: string;
  clientId: string;
  redirectUri?: string;
  scope?: string;
  authority?: string; // Will be computed from tenantId
}

export interface OAuthConfig {
  provider: OAuthProvider;
  keycloak?: KeycloakConfig;
  entra?: EntraConfig;
}

export interface ApiConfig {
  baseUrl: string;
  endpoints: {
    [key: string]: string;
  };
}

export interface AppConfig {
  oauth: OAuthConfig;
  api: ApiConfig;
}
