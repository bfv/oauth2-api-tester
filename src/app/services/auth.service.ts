import { Injectable, signal, computed } from '@angular/core';
import { AuthConfig, OAuthService, OAuthEvent, OAuthErrorEvent } from 'angular-oauth2-oidc';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { ConfigService } from './config.service';
import { TokenInfo, DecodedToken } from '../models/api.model';
import { KeycloakConfig, EntraConfig, OAuthProvider } from '../models/config.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _isAuthenticated = signal(false);
  private _tokenInfo = signal<TokenInfo | null>(null);
  private _errorMessage = signal<string>('');
  private _isProcessing = signal(false);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly tokenInfo = this._tokenInfo.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  
  readonly accessToken = computed(() => this._tokenInfo()?.access_token || '');
  readonly hasValidToken = computed(() => {
    const token = this._tokenInfo();
    return token ? this.isTokenValid(token.access_token) : false;
  });

  constructor(
    private oauthService: OAuthService,
    private configService: ConfigService,
    private http: HttpClient
  ) {
    this.setupOAuthService();
    this.checkInitialAuthState();
  }

  private setupOAuthService(): void {
    // Enable OAuth debug logging
    this.oauthService.showDebugInformation = true;
    
    this.oauthService.events.subscribe((event: OAuthEvent) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] OAuth Event:`, event.type, event);
      
      // Store last few events in localStorage for debugging
      const debugLog = JSON.parse(localStorage.getItem('oauth-debug') || '[]');
      debugLog.push({ timestamp, type: event.type, data: event });
      if (debugLog.length > 10) debugLog.shift(); // Keep only last 10 events
      localStorage.setItem('oauth-debug', JSON.stringify(debugLog));
      
      if (event.type === 'token_received') {
        console.log('✅ Token received successfully');
        this.updateTokenInfo();
        this._isAuthenticated.set(true);
        this._errorMessage.set('');
      } else if (event.type === 'code_error') {
        console.error('❌ Authorization code error:', event);
        this.debugLog('Authorization code error', event);
        this._errorMessage.set(`Authorization error: ${JSON.stringify(event)}`);
      } else if (event.type === 'token_refresh_error') {
        console.error('❌ Token refresh error:', event);
        this.debugLog('Token refresh error', event);
      } else if (event.type === 'discovery_document_validation_error') {
        console.error('❌ Discovery document validation error:', event);
        this.debugLog('Discovery document validation error', event);
        
        // Provide specific guidance based on current provider
        const currentProvider = this.configService.getCurrentProvider();
        if (currentProvider === 'entra') {
          this._errorMessage.set('Microsoft Entra discovery document validation failed. This may be due to tenant configuration or endpoint issues. Please check your Tenant ID and ensure the application is properly registered in Azure Portal.');
        } else {
          this._errorMessage.set(`Discovery document validation failed for ${currentProvider}. Please check your configuration.`);
        }
      } else if (event.type === 'discovery_document_load_error') {
        console.error('❌ Discovery document load error:', event);
        this.debugLog('Discovery document load error', event);
        
        const currentProvider = this.configService.getCurrentProvider();
        if (currentProvider === 'entra') {
          this._errorMessage.set('Failed to load Microsoft Entra discovery document. Please verify your Tenant ID is correct and the tenant exists.');
        } else {
          this._errorMessage.set(`Failed to load discovery document for ${currentProvider}. Please check your issuer URL.`);
        }
      }
    });
  }

  configureOAuth(): boolean {
    const provider = this.configService.getCurrentProvider();
    
    if (provider === 'keycloak') {
      const config = this.configService.getKeycloakConfig();
      return config ? this.configureKeycloak(config) : false;
    } else if (provider === 'entra') {
      const config = this.configService.getEntraConfig();
      return config ? this.configureEntra(config) : false;
    }
    
    return false;
  }

  configureAuth(config: KeycloakConfig): boolean {
    return this.configureKeycloak(config);
  }

  configureKeycloak(config: KeycloakConfig): boolean {
    try {
      this.debugLog('Configuring Keycloak auth with config', config);
      
      // Determine the correct redirect URI
      let redirectUri = config.redirectUri;
      if (!redirectUri) {
        // Use /auth route since that's where we handle OAuth callbacks
        redirectUri = window.location.origin + '/auth';
        this.debugLog('No redirect URI provided, using /auth route', redirectUri);
      } else {
        // Check if the redirect URI is different from our current origin
        const redirectUrl = new URL(redirectUri);
        const currentUrl = new URL(window.location.origin);
        
        if (redirectUrl.origin !== currentUrl.origin) {
          this.debugLog('Custom redirect URI detected, will intercept OAuth callback', redirectUri);
          // We'll handle the custom redirect in the OAuth flow
        }
      }
      
      const authConfig: AuthConfig = {
        issuer: config.issuer,
        clientId: config.clientId,
        redirectUri: redirectUri,
        responseType: 'code',
        scope: config.scope || 'openid profile email',
        showDebugInformation: true,
        requireHttps: false, // Allow HTTP for development
        useSilentRefresh: true,
        silentRefreshRedirectUri: window.location.origin + '/silent-refresh.html',
        // Disable PKCE to match Keycloak configuration
        disablePKCE: true,
        // Store state/nonce in sessionStorage to survive page reloads
        sessionChecksEnabled: true
      };

      this.debugLog('Keycloak OAuth Auth Config', authConfig);
      
      this.oauthService.configure(authConfig);
      this.oauthService.setupAutomaticSilentRefresh();
      
      this.debugLog('Keycloak auth configuration successful');
      return true;
    } catch (error) {
      console.error('Keycloak auth configuration error:', error);
      this.debugLog('Keycloak auth configuration error', error);
      this._errorMessage.set(`Configuration error: ${error}`);
      return false;
    }
  }

  configureEntra(config: EntraConfig): boolean {
    try {
      this.debugLog('Configuring Entra auth with config', config);
      
      // Determine the correct redirect URI
      let redirectUri = config.redirectUri;
      if (!redirectUri) {
        redirectUri = window.location.origin + '/auth';
        this.debugLog('No redirect URI provided, using /auth route', redirectUri);
      } else {
        // Check if the redirect URI is different from our current origin
        const redirectUrl = new URL(redirectUri);
        const currentUrl = new URL(window.location.origin);
        
        if (redirectUrl.origin !== currentUrl.origin) {
          this.debugLog('Custom redirect URI detected, will intercept OAuth callback', redirectUri);
          // We'll handle the custom redirect in the OAuth flow
        }
      }
      
      // Build authority URL from tenant ID
      const authority = config.authority || `https://login.microsoftonline.com/${config.tenantId}`;
      
      // For Entra, we need to be more explicit about endpoints due to discovery document issues
      const authConfig: AuthConfig = {
        issuer: authority,
        clientId: config.clientId,
        redirectUri: redirectUri,
        responseType: 'code',
        scope: config.scope || 'openid profile email User.Read',
        showDebugInformation: true,
        requireHttps: false, // Allow HTTP for development
        useSilentRefresh: true,
        silentRefreshRedirectUri: window.location.origin + '/silent-refresh.html',
        // Enable PKCE for Microsoft Entra (recommended)
        disablePKCE: false,
        // Store state/nonce in sessionStorage to survive page reloads
        sessionChecksEnabled: true,
        // Entra-specific settings for compatibility
        oidc: true,
        strictDiscoveryDocumentValidation: false,
        // Additional settings to handle Entra's discovery document format
        skipIssuerCheck: true,
        // Manually specify endpoints to avoid discovery document issues
        loginUrl: `${authority}/oauth2/v2.0/authorize`,
        tokenEndpoint: `${authority}/oauth2/v2.0/token`,
        userinfoEndpoint: `${authority}/oidc/userinfo`,
        logoutUrl: `${authority}/oauth2/v2.0/logout`,
        // Disable some validations that might fail with Entra
        disableAtHashCheck: true,
        // Try to use the v2.0 endpoint which is more standard-compliant
        customQueryParams: {
          'response_mode': 'query'
        }
      };

      this.debugLog('Entra OAuth Auth Config', authConfig);
      
      this.oauthService.configure(authConfig);
      
      // Don't setup automatic silent refresh for Entra initially due to potential issues
      // this.oauthService.setupAutomaticSilentRefresh();
      
      this.debugLog('Entra auth configuration successful');
      return true;
    } catch (error) {
      console.error('Entra auth configuration error:', error);
      this.debugLog('Entra auth configuration error', error);
      this._errorMessage.set(`Configuration error: ${error}`);
      return false;
    }
  }

  async initializeAuth(): Promise<boolean> {
    try {
      this.debugLog('Initializing authentication...');
      
      // Check current URL for OAuth callback parameters
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      this.debugLog('Current URL', currentUrl);
      this.debugLog('URL Parameters', Object.fromEntries(urlParams.entries()));
      
      // CRITICAL: Configure OAuth service before any callback processing
      const currentProvider = this.configService.getCurrentProvider();
      
      let hasValidConfig = false;
      if (currentProvider === 'keycloak') {
        const keycloakConfig = this.configService.getKeycloakConfig();
        if (!keycloakConfig) {
          this.debugLog('No Keycloak configuration found - cannot process OAuth callback');
          this._errorMessage.set('OAuth configuration not found. Please configure first.');
          return false;
        }
        hasValidConfig = this.configureKeycloak(keycloakConfig);
      } else if (currentProvider === 'entra') {
        const entraConfig = this.configService.getEntraConfig();
        if (!entraConfig) {
          this.debugLog('No Entra configuration found - cannot process OAuth callback');
          this._errorMessage.set('OAuth configuration not found. Please configure first.');
          return false;
        }
        hasValidConfig = this.configureEntra(entraConfig);
      } else {
        this.debugLog('No valid OAuth provider configured');
        this._errorMessage.set('No OAuth provider configured. Please configure first.');
        return false;
      }
      
      if (!hasValidConfig) {
        this.debugLog('Failed to configure OAuth service');
        this._errorMessage.set('Failed to configure OAuth service');
        return false;
      }
      
      // For OAuth callbacks, we need to load the discovery document FIRST
      // before trying to process the login
      if (window.location.search.includes('code=')) {
        this.debugLog('OAuth callback detected - loading discovery document first');
        try {
          await this.oauthService.loadDiscoveryDocument();
          this.debugLog('Discovery document loaded for callback processing');
        } catch (discoveryError) {
          this.debugLog('Failed to load discovery document for callback', discoveryError);
          this._errorMessage.set('Failed to load OAuth configuration');
          return false;
        }
      }
      
      this.debugLog('OAuth service configured, checking for callback...');
      
      if (window.location.search.includes('code=')) {
        this.debugLog('OAuth authorization code detected in URL - processing callback');
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const sessionState = urlParams.get('session_state');
        this.debugLog('Authorization code details', { 
          code: code?.substring(0, 20) + '...', 
          state: state,
          sessionState: sessionState,
          fullUrl: currentUrl
        });
        
        // Check if the state matches what OAuth service expects
        const expectedState = this.oauthService.state;
        this.debugLog('State validation', {
          receivedState: state,
          expectedState: expectedState,
          statesMatch: state === expectedState,
          oAuthServiceConfigured: !!this.oauthService.clientId
        });
        
        if (state !== expectedState) {
          this.debugLog('WARNING: State mismatch - this will prevent token exchange');
          
          // The angular-oauth2-oidc library should handle state automatically
          // If there's a mismatch, it usually means the OAuth service wasn't
          // properly configured when the callback was processed
          
          // Try a different approach: let the OAuth service handle the state internally
          this.debugLog('Attempting to let OAuth service handle state validation internally');
          
          // Don't manually override state - let the library handle it
          // The sessionChecksEnabled: true should help with this
        }
      }
      
      if (window.location.search.includes('error=')) {
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        this.debugLog('OAuth error detected in URL', { error, errorDescription });
        this._errorMessage.set(`OAuth error: ${error} - ${errorDescription}`);
        return false;
      }
      
      this.debugLog('About to call loadDiscoveryDocumentAndTryLogin...');
      
      // Add detailed debugging before the call
      this.debugLog('OAuth service state before loadDiscoveryDocumentAndTryLogin', {
        issuer: this.oauthService.issuer,
        clientId: this.oauthService.clientId,
        redirectUri: this.oauthService.redirectUri,
        responseType: this.oauthService.responseType,
        scope: this.oauthService.scope,
        state: this.oauthService.state,
        hasValidAccessToken: this.oauthService.hasValidAccessToken(),
        hasValidIdToken: this.oauthService.hasValidIdToken()
      });
      
      try {
        // Use tryLogin instead of loadDiscoveryDocumentAndTryLogin since we already loaded the discovery
        if (window.location.search.includes('code=')) {
          this.debugLog('Processing OAuth callback with tryLogin()...');
          const loginResult = await this.oauthService.tryLogin();
          this.debugLog('tryLogin() completed', { loginResult });
        } else {
          this.debugLog('No callback parameters, doing normal initialization...');
          await this.oauthService.loadDiscoveryDocumentAndTryLogin();
          this.debugLog('loadDiscoveryDocumentAndTryLogin completed');
        }
        
        // Check what happened immediately after
        this.debugLog('OAuth service state after processing', {
          state: this.oauthService.state,
          hasValidAccessToken: this.oauthService.hasValidAccessToken(),
          hasValidIdToken: this.oauthService.hasValidIdToken(),
          accessToken: this.oauthService.getAccessToken()?.substring(0, 20) + '...' || 'null',
          idToken: this.oauthService.getIdToken()?.substring(0, 20) + '...' || 'null'
        });
        
        // If OAuth library didn't handle the token exchange, do it manually
        const hasCodeParam = window.location.search.includes('code=');
        const hasValidToken = this.oauthService.hasValidAccessToken();
        
        this.debugLog('Token exchange decision point', {
          hasCode: hasCodeParam,
          hasValidToken: hasValidToken,
          accessToken: this.oauthService.getAccessToken()?.substring(0, 20) + '...' || 'null',
          willTriggerManualExchange: hasCodeParam && !hasValidToken
        });
        
        // FORCE manual exchange if we have a code, regardless of what OAuth service claims
        if (hasCodeParam) {
          const code = urlParams.get('code');
          if (code && !hasValidToken) {
            this.debugLog('TRIGGERING MANUAL TOKEN EXCHANGE - OAuth library failed');
            this.debugLog('Authorization code for manual exchange', { code: code?.substring(0, 20) + '...', fullCode: code });
            this.debugLog('About to call manualTokenExchange...');
            try {
              // Manual token exchange currently only works with Keycloak
              if (currentProvider === 'keycloak') {
                const keycloakConfig = this.configService.getKeycloakConfig();
                if (keycloakConfig) {
                  await this.manualTokenExchange(code, keycloakConfig);
                  this.debugLog('Manual token exchange completed');
                }
              } else {
                this.debugLog('Manual token exchange not implemented for Entra - relying on OAuth library');
              }
            } catch (manualError) {
              this.debugLog('Manual token exchange threw error', manualError);
            }
          } else if (code && hasValidToken) {
            this.debugLog('Have code and OAuth service claims valid token - checking if token is actually accessible');
            const actualToken = this.oauthService.getAccessToken();
            if (!actualToken || actualToken.length < 10) {
              this.debugLog('OAuth service lies - no real token found, forcing manual exchange');
              try {
                // Manual token exchange currently only works with Keycloak
                if (currentProvider === 'keycloak') {
                  const keycloakConfig = this.configService.getKeycloakConfig();
                  if (keycloakConfig) {
                    await this.manualTokenExchange(code, keycloakConfig);
                    this.debugLog('Forced manual token exchange completed');
                  }
                }
              } catch (manualError) {
                this.debugLog('Forced manual token exchange threw error', manualError);
              }
            } else {
              this.debugLog('OAuth service actually has a valid token', { tokenLength: actualToken.length });
            }
          } else {
            this.debugLog('ERROR: No authorization code found for manual exchange');
          }
        } else {
          this.debugLog('No authorization code in URL - manual exchange not applicable');
        }
        
      } catch (tokenError) {
        this.debugLog('OAuth processing threw error', tokenError);
        this._errorMessage.set(`Token exchange failed: ${tokenError}`);
        throw tokenError;
      }
      
      // Check token status immediately after processing
      const hasValidToken = this.oauthService.hasValidAccessToken();
      const accessToken = this.oauthService.getAccessToken();
      const refreshToken = this.oauthService.getRefreshToken();
      const idToken = this.oauthService.getIdToken();
      
      this.debugLog('Token status after loadDiscoveryDocumentAndTryLogin', {
        hasValidAccessToken: hasValidToken,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasIdToken: !!idToken,
        accessTokenLength: accessToken?.length || 0,
        oAuthState: this.oauthService.state,
        claims: this.oauthService.getIdentityClaims()
      });
      
      if (hasValidToken) {
        this.debugLog('Valid access token found after initialization - updating token info');
        this.updateTokenInfo();
        this._isAuthenticated.set(true);
        
        // Clean up URL parameters after successful login
        if (window.location.search.includes('code=')) {
          this.debugLog('Cleaning up URL after successful authentication');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        return true;
      } else {
        this.debugLog('No valid access token found after initialization');
        
        // If we had a code but no token, something went wrong with token exchange
        if (window.location.search.includes('code=')) {
          this.debugLog('ERROR: Had authorization code but no access token - token exchange failed');
          this._errorMessage.set('Token exchange failed. Check Keycloak client configuration.');
        }
      }
      return false;
    } catch (error) {
      console.error('Initialization error:', error);
      this.debugLog('Initialization error', error);
      this._errorMessage.set(`Initialization error: ${error}`);
      return false;
    }
  }

  login(): void {
    this.debugLog('Login method called');
    this._errorMessage.set('');
    
    // Determine current provider and get configuration
    const currentProvider = this.configService.getCurrentProvider();
    let configExists = false;
    
    if (currentProvider === 'keycloak') {
      const config = this.configService.getKeycloakConfig();
      if (!config) {
        this._errorMessage.set('Please configure Keycloak settings first');
        return;
      }
      configExists = this.configureKeycloak(config);
      this.debugLog('Retrieved Keycloak config for login', config);
    } else if (currentProvider === 'entra') {
      const config = this.configService.getEntraConfig();
      if (!config) {
        this._errorMessage.set('Please configure Microsoft Entra settings first');
        return;
      }
      configExists = this.configureEntra(config);
      this.debugLog('Retrieved Entra config for login', config);
    } else {
      this._errorMessage.set('Please select and configure an OAuth provider first');
      return;
    }
    
    if (!configExists) {
      this._errorMessage.set('Failed to configure authentication');
      return;
    }
    
    this.debugLog('Loading discovery document for login...');
    
    // Load discovery document and then initiate login
    this.oauthService.loadDiscoveryDocument().then(() => {
      this.debugLog('Discovery document loaded, initiating code flow...');
      
      // Log the current OAuth configuration before starting code flow
      this.debugLog('OAuth service configuration before code flow', {
        issuer: this.oauthService.issuer,
        clientId: this.oauthService.clientId,
        redirectUri: this.oauthService.redirectUri,
        responseType: this.oauthService.responseType,
        scope: this.oauthService.scope,
        showDebugInformation: this.oauthService.showDebugInformation,
        oidc: this.oauthService.oidc,
        requireHttps: this.oauthService.requireHttps
      });
      
      try {
        this.debugLog('About to call initCodeFlow()...');
        
        // Log the exact parameters that will be sent to OAuth provider
        this.debugLog('OAuth authorization URL parameters', {
          authorizationEndpoint: (this.oauthService as any).authorizationEndpoint,
          issuer: this.oauthService.issuer,
          clientId: this.oauthService.clientId,
          redirectUri: this.oauthService.redirectUri,
          responseType: this.oauthService.responseType,
          scope: this.oauthService.scope,
          state: this.oauthService.state,
          nonce: (this.oauthService as any).nonce
        });
        
        // Manually construct what the authorization URL should look like for debugging
        let expectedAuthUrl = '';
        if (currentProvider === 'keycloak') {
          const keycloakConfig = this.configService.getKeycloakConfig();
          if (keycloakConfig) {
            expectedAuthUrl = `${keycloakConfig.issuer}/protocol/openid-connect/auth?` +
              `client_id=${encodeURIComponent(keycloakConfig.clientId)}&` +
              `redirect_uri=${encodeURIComponent(window.location.origin + '/auth')}&` +
              `response_type=code&` +
              `scope=${encodeURIComponent(keycloakConfig.scope || 'openid profile email')}`;
          }
        } else if (currentProvider === 'entra') {
          const entraConfig = this.configService.getEntraConfig();
          if (entraConfig) {
            const authority = entraConfig.authority || `https://login.microsoftonline.com/${entraConfig.tenantId}`;
            expectedAuthUrl = `${authority}/oauth2/v2.0/authorize?` +
              `client_id=${encodeURIComponent(entraConfig.clientId)}&` +
              `redirect_uri=${encodeURIComponent(window.location.origin + '/auth')}&` +
              `response_type=code&` +
              `scope=${encodeURIComponent(entraConfig.scope || 'openid profile email User.Read')}`;
          }
        }
          
        this.debugLog('Expected authorization URL', expectedAuthUrl);
        
        this.oauthService.initCodeFlow();
        this.debugLog(`initCodeFlow() called - should redirect to ${currentProvider} now`);
      } catch (error) {
        this.debugLog('Error during initCodeFlow()', error);
        this._errorMessage.set(`Code flow initiation failed: ${error}`);
      }
    }).catch(error => {
      this.debugLog('Discovery document loading failed', error);
      console.error('Discovery document loading failed:', error);
      let errorMessage = 'Login initialization failed';
      
      if (error.status === 0) {
        errorMessage = `Cannot connect to ${currentProvider === 'keycloak' ? 'Keycloak' : 'Microsoft Entra'} server. Please check:\n` +
                      '1. Server is running and accessible\n' +
                      `2. CORS is configured in ${currentProvider === 'keycloak' ? 'Keycloak' : 'Entra'}\n` +
                      '3. URL is correct in configuration';
      } else if (error.status === 404) {
        errorMessage = currentProvider === 'keycloak' ? 
          'Keycloak realm not found. Please check your issuer URL.' :
          'Entra tenant not found. Please check your tenant ID.';
      } else {
        errorMessage = `Login failed: ${error.message || error}`;
      }
      
      this._errorMessage.set(errorMessage);
    });
  }

  logout(): void {
    this.oauthService.revokeTokenAndLogout();
    this._isAuthenticated.set(false);
    this._tokenInfo.set(null);
    this._errorMessage.set('');
  }

  private updateTokenInfo(): void {
    const accessToken = this.oauthService.getAccessToken();
    const refreshToken = this.oauthService.getRefreshToken();
    const idToken = this.oauthService.getIdToken();
    
    if (accessToken) {
      const tokenInfo: TokenInfo = {
        access_token: accessToken,
        refresh_token: refreshToken,
        id_token: idToken,
        token_type: 'Bearer',
        expires_in: this.oauthService.getAccessTokenExpiration() - Date.now(),
        scope: this.oauthService.scope
      };
      
      this._tokenInfo.set(tokenInfo);
    }
  }

  private checkInitialAuthState(): void {
    // Check if we have a stored configuration and try to initialize
    const currentProvider = this.configService.getCurrentProvider();
    let hasConfig = false;
    
    if (currentProvider === 'keycloak') {
      const keycloakConfig = this.configService.getKeycloakConfig();
      if (keycloakConfig) {
        hasConfig = this.configureKeycloak(keycloakConfig);
      }
    } else if (currentProvider === 'entra') {
      const entraConfig = this.configService.getEntraConfig();
      if (entraConfig) {
        hasConfig = this.configureEntra(entraConfig);
      }
    }
    
    if (hasConfig) {
      // Set processing state during initialization
      this._isProcessing.set(true);
      this.initializeAuth().then((success) => {
        this._isProcessing.set(false);
        if (success) {
          console.log('Initial authentication successful');
        }
      }).catch((error) => {
        this._isProcessing.set(false);
        console.error('Initial authentication failed:', error);
      });
    }
  }

  getDecodedToken(token: string): DecodedToken | null {
    try {
      const decoded = jwtDecode(token, { header: true });
      const payload = jwtDecode(token);
      
      return {
        header: decoded,
        payload: payload
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<void> {
    await this.oauthService.refreshToken();
    this.updateTokenInfo();
  }

  getDebugLog(): any[] {
    return JSON.parse(localStorage.getItem('oauth-debug') || '[]');
  }

  clearDebugLog(): void {
    localStorage.removeItem('oauth-debug');
  }

  private debugLog(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[AuthService] ${timestamp}: ${message}`, data || '');
    
    // Store in localStorage for persistent debugging
    const debugLog = JSON.parse(localStorage.getItem('oauth-debug') || '[]');
    debugLog.push({ 
      timestamp, 
      type: 'auth_service_debug', 
      message, 
      data: data || null 
    });
    if (debugLog.length > 20) debugLog.shift(); // Keep only last 20 events
    localStorage.setItem('oauth-debug', JSON.stringify(debugLog));
  }

  private async manualTokenExchange(code: string, config: KeycloakConfig): Promise<void> {
    console.log('🚀 MANUAL TOKEN EXCHANGE STARTED 🚀');
    this.debugLog('Starting manual token exchange', { code: code.substring(0, 20) + '...' });
    
    try {
      
      // Build token endpoint URL
      const tokenUrl = `${config.issuer}/protocol/openid-connect/token`;
      
      // Prepare form data for token exchange
      const body = new URLSearchParams();
      body.set('grant_type', 'authorization_code');
      body.set('code', code);
      body.set('redirect_uri', config.redirectUri || window.location.origin + '/auth');
      body.set('client_id', config.clientId);
      
      this.debugLog('Manual token exchange request', {
        url: tokenUrl,
        grantType: 'authorization_code',
        clientId: config.clientId,
        redirectUri: window.location.origin
      });
      
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      };
      
      const response = await this.http.post<any>(tokenUrl, body.toString(), { headers }).toPromise();
      
      this.debugLog('Manual token exchange successful', {
        hasAccessToken: !!response.access_token,
        hasRefreshToken: !!response.refresh_token,
        hasIdToken: !!response.id_token,
        tokenType: response.token_type,
        expiresIn: response.expires_in
      });
      
      // Manually set tokens in OAuth service
      if (response.access_token) {
        (this.oauthService as any).accessToken = response.access_token;
        (this.oauthService as any).idToken = response.id_token;
        (this.oauthService as any).refreshToken = response.refresh_token;
        
        // Update our internal state
        this.updateTokenInfo();
        this._isAuthenticated.set(true);
        this._errorMessage.set('');
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        this.debugLog('Manual token exchange completed successfully');
      }
      
    } catch (error) {
      this.debugLog('Manual token exchange failed', error);
      console.error('Manual token exchange error:', error);
      this._errorMessage.set(`Manual token exchange failed: ${error}`);
    }
  }
}
