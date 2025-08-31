import { Injectable, inject } from '@angular/core';
import { AppConfig, KeycloakConfig, EntraConfig, OAuthConfig, ApiConfig, OAuthProvider } from '../models/config.model';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly STORAGE_KEY = 'oauth2-api-tester-config';

  getConfig(): AppConfig | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  saveConfig(config: AppConfig): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  getOAuthConfig(): OAuthConfig | null {
    const config = this.getConfig();
    return config?.oauth || null;
  }

  getKeycloakConfig(): KeycloakConfig | null {
    const config = this.getConfig();
    return config?.oauth?.keycloak || null;
  }

  getEntraConfig(): EntraConfig | null {
    const config = this.getConfig();
    return config?.oauth?.entra || null;
  }

  getCurrentProvider(): OAuthProvider {
    const config = this.getConfig();
    return config?.oauth?.provider || 'keycloak';
  }

  getApiConfig(): ApiConfig | null {
    const config = this.getConfig();
    return config?.api || null;
  }

  saveOAuthConfig(oauthConfig: OAuthConfig): void {
    const config = this.getConfig() || {
      oauth: oauthConfig,
      api: { baseUrl: '', endpoints: {} }
    };
    config.oauth = oauthConfig;
    this.saveConfig(config);
  }

  saveKeycloakConfig(keycloakConfig: KeycloakConfig): void {
    const config = this.getConfig() || {
      oauth: { provider: 'keycloak', keycloak: keycloakConfig },
      api: { baseUrl: '', endpoints: {} }
    };
    
    if (!config.oauth) {
      config.oauth = { provider: 'keycloak' };
    }
    
    config.oauth.provider = 'keycloak';
    config.oauth.keycloak = keycloakConfig;
    this.saveConfig(config);
  }

  saveEntraConfig(entraConfig: EntraConfig): void {
    const config = this.getConfig() || {
      oauth: { provider: 'entra', entra: entraConfig },
      api: { baseUrl: '', endpoints: {} }
    };
    
    if (!config.oauth) {
      config.oauth = { provider: 'entra' };
    }
    
    config.oauth.provider = 'entra';
    config.oauth.entra = entraConfig;
    this.saveConfig(config);
  }

  saveApiConfig(apiConfig: ApiConfig): void {
    const config = this.getConfig() || {
      oauth: { provider: 'keycloak' as OAuthProvider },
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
      issuer: 'https://keycloak.bfv.io:8443/realms/<realm>',
      clientId: '<client-id>',
      redirectUri: window.location.origin + '/auth',
      scope: 'openid profile email'
    };
  }

  getDefaultEntraConfig(): EntraConfig {
    return {
      tenantId: 'common', // or specific tenant ID
      clientId: 'your-client-id-here', // Put your actual client ID here for testing
      redirectUri: 'https://localhost:4200',
      scope: 'openid profile email User.Read',
      authority: 'https://login.microsoftonline.com/common'
    };
  }

  getDefaultOAuthConfig(): OAuthConfig {
    return {
      provider: 'keycloak',
      keycloak: this.getDefaultKeycloakConfig(),
      entra: this.getDefaultEntraConfig()
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

  hasOAuthConfig(): boolean {
    const provider = this.getCurrentProvider();
    if (provider === 'keycloak') {
      const config = this.getKeycloakConfig();
      return config !== null && 
             !!config.issuer && 
             !!config.clientId && 
             !config.clientId.includes('<') && 
             !config.clientId.includes('>');
    } else if (provider === 'entra') {
      const config = this.getEntraConfig();
      return config !== null && 
             !!config.tenantId && 
             !!config.clientId && 
             !config.clientId.includes('<') && 
             !config.clientId.includes('>');
    }
    return false;
  }
}
