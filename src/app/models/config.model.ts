export interface KeycloakConfig {
  issuer: string;
  clientId: string;
  redirectUri?: string;
  scope?: string;
}

export interface ApiConfig {
  baseUrl: string;
  endpoints: {
    [key: string]: string;
  };
}

export interface AppConfig {
  keycloak: KeycloakConfig;
  api: ApiConfig;
}
