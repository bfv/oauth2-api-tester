import { Injectable, signal, computed } from '@angular/core';
import { AuthConfig, OAuthService, OAuthEvent, OAuthErrorEvent } from 'angular-oauth2-oidc';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { ConfigService } from './config.service';
import { TokenInfo, DecodedToken } from '../models/api.model';
import { KeycloakConfig } from '../models/config.model';

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
      } else if (event.type === 'logout') {
        console.log('🚪 User logged out');
        this._isAuthenticated.set(false);
        this._tokenInfo.set(null);
      } else if (event.type === 'token_error') {
        const errorEvent = event as OAuthErrorEvent;
        console.error('❌ Token error:', errorEvent);
        this._errorMessage.set(`Token error: ${errorEvent.reason}`);
      } else if (event.type === 'discovery_document_loaded') {
        console.log('📋 Discovery document loaded successfully');
      } else if (event.type === 'discovery_document_load_error') {
        console.error('❌ Discovery document load error:', event);
      }
    });
  }

  configureAuth(config: KeycloakConfig): boolean {
    try {
      this.debugLog('Configuring auth with config', config);
      
      // Determine the correct redirect URI
      let redirectUri = config.redirectUri;
      if (!redirectUri) {
        // Use /auth route since that's where we handle OAuth callbacks
        redirectUri = window.location.origin + '/auth';
        this.debugLog('No redirect URI provided, using /auth route', redirectUri);
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

      this.debugLog('OAuth Auth Config', authConfig);
      
      this.oauthService.configure(authConfig);
      this.oauthService.setupAutomaticSilentRefresh();
      
      this.debugLog('Auth configuration successful');
      return true;
    } catch (error) {
      console.error('Auth configuration error:', error);
      this.debugLog('Auth configuration error', error);
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
      const config = this.configService.getKeycloakConfig();
      if (!config) {
        this.debugLog('No configuration found - cannot process OAuth callback');
        this._errorMessage.set('Keycloak configuration not found. Please configure first.');
        return false;
      }
      
      // Configure OAuth service first
      if (!this.configureAuth(config)) {
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
              await this.manualTokenExchange(code, config);
              this.debugLog('Manual token exchange completed');
            } catch (manualError) {
              this.debugLog('Manual token exchange threw error', manualError);
            }
          } else if (code && hasValidToken) {
            this.debugLog('Have code and OAuth service claims valid token - checking if token is actually accessible');
            const actualToken = this.oauthService.getAccessToken();
            if (!actualToken || actualToken.length < 10) {
              this.debugLog('OAuth service lies - no real token found, forcing manual exchange');
              try {
                await this.manualTokenExchange(code, config);
                this.debugLog('Forced manual token exchange completed');
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
    
    // Ensure we have configuration before attempting login
    const config = this.configService.getKeycloakConfig();
    this.debugLog('Retrieved config for login', config);
    
    if (!config) {
      this._errorMessage.set('Please configure Keycloak settings first');
      return;
    }
    
    // Configure and initialize OAuth service before login
    if (!this.configureAuth(config)) {
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
        
        // Log the exact parameters that will be sent to Keycloak
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
        
        // Manually construct what the authorization URL should look like
        const authUrl = `${config.issuer}/protocol/openid-connect/auth?` +
          `client_id=${encodeURIComponent(config.clientId)}&` +
          `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent(config.scope || 'openid profile email')}`;
          
        this.debugLog('Expected authorization URL', authUrl);
        
        this.oauthService.initCodeFlow();
        this.debugLog('initCodeFlow() called - should redirect to Keycloak now');
      } catch (error) {
        this.debugLog('Error during initCodeFlow()', error);
        this._errorMessage.set(`Code flow initiation failed: ${error}`);
      }
    }).catch(error => {
      this.debugLog('Discovery document loading failed', error);
      console.error('Discovery document loading failed:', error);
      let errorMessage = 'Login initialization failed';
      
      if (error.status === 0) {
        errorMessage = 'Cannot connect to Keycloak server. Please check:\n' +
                      '1. Server is running and accessible\n' +
                      '2. CORS is configured in Keycloak\n' +
                      '3. URL is correct in configuration';
      } else if (error.status === 404) {
        errorMessage = 'Keycloak realm not found. Please check your issuer URL.';
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
    const config = this.configService.getKeycloakConfig();
    if (config) {
      if (this.configureAuth(config)) {
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
