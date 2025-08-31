import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { OAuthProvider } from '../../models/config.model';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="auth-container">
      <h2>Authentication</h2>
      <ng-container *ngIf="hasOAuthConfig(); else disabledAuth">
        <!-- ...existing authentication page content... -->
        <div *ngIf="!authService.isAuthenticated()" class="login-section">
          <div class="auth-info">
            <p><strong>Authorization Server URL:</strong> {{ getAuthServerUrl() }}</p>
            <p><strong>Client ID:</strong> {{ getClientId() }}</p>
          </div>
          <div *ngIf="authService.isProcessing()" class="processing-message">
            <p>🔄 Processing authentication...</p>
            <p>Please wait while we complete the login process.</p>
          </div>
          <div *ngIf="!authService.isProcessing()">
            <div class="unauth-box">
              <p>You are not authenticated. Please log in to continue.</p>
              <button (click)="login()" class="btn btn-primary" [disabled]="!hasOAuthConfig() || authService.isProcessing()">Login with {{ getCurrentProviderDisplayName() }}</button>
            </div>
            <div *ngIf="authService.errorMessage()" class="error-message">
              <strong>Error:</strong>
              <pre>{{ authService.errorMessage() }}</pre>
            </div>
          </div>
        </div>
        <div *ngIf="authService.isAuthenticated()" class="authenticated-section">
          <div class="auth-info">
            <p><strong>Authorization Server URL:</strong> {{ getAuthServerUrl() }}</p>
            <p><strong>Client ID:</strong> {{ getClientId() }}</p>
          </div>
          <div class="status-card">
            <h3>✅ Authentication Successful</h3>
            <p>You are successfully authenticated with {{ getCurrentProviderDisplayName() }}.</p>
            <p><strong>Token Valid:</strong> {{ authService.hasValidToken() ? 'Yes' : 'No' }}</p>
            <div class="actions">
              <button (click)="refreshToken()" class="btn btn-secondary" [disabled]="refreshing">
                {{ refreshing ? 'Refreshing...' : 'Refresh Token' }}
              </button>
              <button (click)="logout()" class="btn btn-danger">Logout</button>
            </div>
          </div>
          <div *ngIf="refreshMessage" class="message" [class]="refreshMessageType">
            {{ refreshMessage }}
          </div>
        </div>
        <!-- Debug Section -->
        <div class="debug-section">
          <h3>🔧 Debug Information</h3>
          <button (click)="showDebugLog = !showDebugLog" class="btn btn-secondary btn-sm">
            {{ showDebugLog ? 'Hide' : 'Show' }} OAuth Debug Log
          </button>
          <button (click)="clearDebugLog()" class="btn btn-secondary btn-sm">Clear Log</button>
          <div *ngIf="showDebugLog" class="debug-log">
            <h4>Recent OAuth Events:</h4>
            <div *ngIf="getDebugLog().length === 0" class="no-events">
              No OAuth events recorded yet.
            </div>
            <div *ngFor="let event of getDebugLog(); trackBy: trackByIndex" class="debug-event">
              <strong>{{ event.timestamp }}</strong> - {{ event.type }}
              <pre *ngIf="event.data">{{ formatJson(event.data) }}</pre>
            </div>
          </div>
        </div>
      </ng-container>
      <ng-template #disabledAuth>
        <div class="auth-disabled">
          <h3>Authentication Disabled</h3>
          <p>No OAuth configuration found. Please configure your provider in the Configuration tab.</p>
          <button routerLink="/config" class="btn btn-secondary">Go to Configuration</button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .auth-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .login-section, .authenticated-section {
      text-align: center;
      padding: 20px;
    }
    
    button.btn:disabled,
    .btn:disabled {
      opacity: 1 !important;
      cursor: not-allowed !important;
      background: #a6a6c8 !important;
      color: #e0e0e0 !important;
      box-shadow: none !important;
      font-weight: 500;
    }
    .unauth-box {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 0;
      margin-left: -20px;
      width: calc(100% + 40px);
      box-sizing: border-box;
      text-align: left;
    }
    
    .status-card {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 0;
      margin-left: -20px;
      width: calc(100% + 40px);
      box-sizing: border-box;
      text-align: left;
    }
    
    .status-card h3 {
      color: #28a745;
      margin-bottom: 15px;
    }
    
    .actions {
      margin-top: 20px;
    }
    
    .btn {
      padding: 10px 32px;
      border: none;
      border-radius: 24px;
      cursor: pointer;
      margin: 0 8px;
      font-size: 16px;
      background: linear-gradient(90deg, #7b7fd7 0%, #8e8edc 100%);
      color: #fff;
      font-weight: 500;
      transition: background 0.2s, color 0.2s, opacity 0.2s;
      box-shadow: none;
    }
    
    .btn-primary {
      background-color: #007bff;
  /* color: white; */
    }
    .auth-info {
      text-align: left;
      margin-bottom: 20px;
      margin-left: -20px;
      padding: 20px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      background-color: #f8f9fa;
      width: calc(100% + 40px);
      box-sizing: border-box;
    }
    
    .btn-danger {
      background-color: #dc3545;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    button.btn[disabled],
    button.btn:disabled,
    .btn[disabled],
    .btn:disabled,
    .btn-primary[disabled],
    .btn-primary:disabled,
    .btn-secondary[disabled],
    .btn-secondary:disabled,
    .btn-danger[disabled],
    .btn-danger:disabled {
      opacity: 0.6 !important;
      cursor: not-allowed !important;
      background: #c0c0c0 !important;
      color: #888 !important;
      box-shadow: none !important;
      font-weight: 500 !important;
      pointer-events: none !important;
    }
    
    .error-message {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f1aeb5;
      padding: 10px;
      border-radius: 5px;
      margin-top: 15px;
    }
    
    .error-message pre {
      margin: 5px 0 0 0;
      font-family: inherit;
      white-space: pre-line;
      background: none;
      border: none;
      padding: 0;
    }
    
    .config-warning {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      text-align: left;
    }
    
    .config-warning p {
      margin: 5px 0;
    }
    
    .processing-message {
      background-color: #e7f3ff;
      color: #004085;
      border: 1px solid #bee5eb;
      padding: 20px;
      border-radius: 5px;
      text-align: center;
      margin-bottom: 20px;
    }
    
    .processing-message p {
      margin: 5px 0;
    }
    
    .debug-section {
      margin-top: 0px;
      padding: 20px;
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      width: 100%;
      box-sizing: border-box;
    }
    
    .debug-section h3 {
      margin-top: 0;
    }
    
    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
      margin-right: 10px;
    }
    
    .debug-log {
      margin-top: 15px;
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: white;
      padding: 10px;
    }
    
    .debug-event {
      border-bottom: 1px solid #eee;
      padding: 10px 0;
      font-size: 12px;
    }
    
    .debug-event:last-child {
      border-bottom: none;
    }
    
    .debug-event pre {
      background-color: #f8f9fa;
      padding: 8px;
      border-radius: 3px;
      margin-top: 5px;
      font-size: 11px;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .no-events {
      color: #6c757d;
      font-style: italic;
      text-align: center;
      padding: 20px;
    }
    
    .message {
      padding: 10px;
      border-radius: 5px;
      margin-top: 15px;
    }
    
    .success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f1aeb5;
    }
  `]
})
export class AuthComponent {
  refreshing = false;
  refreshMessage = '';
  refreshMessageType = 'success';
  showDebugLog = false;

  constructor(
    public authService: AuthService,
    private configService: ConfigService
  ) {}

  getAuthServerUrl(): string {
    const provider = this.configService.getCurrentProvider();
    if (provider === 'keycloak') {
      const config = this.configService.getKeycloakConfig();
      return config?.issuer || '(not set)';
    } else if (provider === 'entra') {
      const config = this.configService.getEntraConfig();
      return config?.authority || (config?.tenantId ? `https://login.microsoftonline.com/${config.tenantId}` : '(not set)');
    }
    return '(not set)';
  }

  getClientId(): string {
    const provider = this.configService.getCurrentProvider();
    if (provider === 'keycloak') {
      const config = this.configService.getKeycloakConfig();
      return config?.clientId || '(not set)';
    } else if (provider === 'entra') {
      const config = this.configService.getEntraConfig();
      return config?.clientId || '(not set)';
    }
    return '(not set)';
  }

  getCurrentProvider(): OAuthProvider {
    return this.configService.getCurrentProvider();
  }

  getCurrentProviderDisplayName(): string {
    const provider = this.getCurrentProvider();
    return provider === 'keycloak' ? 'Keycloak' : 'Microsoft Entra ID';
  }

  hasOAuthConfig(): boolean {
    const provider = this.getCurrentProvider();
    
    if (provider === 'keycloak') {
      const config = this.configService.getKeycloakConfig();
      return config !== null && 
             !!config.issuer && 
             !!config.clientId && 
             !config.clientId.includes('<') && 
             !config.clientId.includes('>');
    } else if (provider === 'entra') {
      const config = this.configService.getEntraConfig();
      return config !== null && 
             !!config.tenantId && 
             !!config.clientId && 
             !config.clientId.includes('<') && 
             !config.clientId.includes('>');
    }
    
    return false;
  }

  hasKeycloakConfig(): boolean {
    const config = this.configService.getKeycloakConfig();
    return config !== null && !!config.issuer && !!config.clientId;
  }

  login(): void {
    console.log('Login button clicked');
    this.authService.login();
  }

  logout(): void {
    this.authService.logout();
    this.refreshMessage = '';
  }

  async refreshToken(): Promise<void> {
    this.refreshing = true;
    this.refreshMessage = '';
    
    try {
      await this.authService.refreshToken();
      this.refreshMessage = 'Token refreshed successfully!';
      this.refreshMessageType = 'success';
    } catch (error) {
      this.refreshMessage = `Failed to refresh token: ${error}`;
      this.refreshMessageType = 'error';
    } finally {
      this.refreshing = false;
      
      // Clear message after 3 seconds
      setTimeout(() => {
        this.refreshMessage = '';
      }, 3000);
    }
  }

  getDebugLog(): any[] {
    return this.authService.getDebugLog();
  }

  clearDebugLog(): void {
    this.authService.clearDebugLog();
  }

  trackByIndex(index: number): number {
    return index;
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}
