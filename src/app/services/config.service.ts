import { Injectable, inject } from '@angular/core';
import { AppConfig, KeycloakConfig, ApiConfig } from '../models/config.model';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly STORAGE_KEY = 'keycloak-jwt-client-config';

  getConfig(): AppConfig | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  saveConfig(config: AppConfig): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  getKeycloakConfig(): KeycloakConfig | null {
    const config = this.getConfig();
    return config?.keycloak || null;
  }

  getApiConfig(): ApiConfig | null {
    const config = this.getConfig();
    return config?.api || null;
  }

  saveKeycloakConfig(keycloakConfig: KeycloakConfig): void {
    const config = this.getConfig() || {
      keycloak: keycloakConfig,
      api: { baseUrl: '', endpoints: {} }
    };
    config.keycloak = keycloakConfig;
    this.saveConfig(config);
  }

  saveApiConfig(apiConfig: ApiConfig): void {
    const config = this.getConfig() || {
      keycloak: { issuer: '', clientId: '' },
      api: apiConfig
    };
    config.api = apiConfig;
    this.saveConfig(config);
  }

  clearConfig(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getDefaultKeycloakConfig(): KeycloakConfig {
    return {
      issuer: 'https://keycloak.bfv.io:8443/realms/cokz',
      clientId: 'jwt-client',
      redirectUri: window.location.origin + '/auth',
      scope: 'openid profile email'
    };
  }

  getDefaultApiConfig(): ApiConfig {
    return {
      baseUrl: 'http://localhost:8810',
      endpoints: {
        'Test Endpoint': '/web/test'
      }
    };
  }
}
