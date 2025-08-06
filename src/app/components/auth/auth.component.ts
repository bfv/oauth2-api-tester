import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="auth-container">
      <h2>Authentication</h2>
      
      <div *ngIf="!authService.isAuthenticated()" class="login-section">
        <div *ngIf="authService.isProcessing()" class="processing-message">
          <p>🔄 Processing authentication...</p>
          <p>Please wait while we complete the login process.</p>
        </div>
        
        <div *ngIf="!authService.isProcessing()">
          <p>You are not authenticated. Please log in to continue.</p>
          
          <div *ngIf="!hasKeycloakConfig()" class="config-warning">
            <p><strong>⚠️ No Keycloak Configuration Found</strong></p>
            <p>Please configure your Keycloak settings first in the Configuration tab.</p>
            <button routerLink="/config" class="btn btn-secondary">Go to Configuration</button>
          </div>
          
          <div *ngIf="hasKeycloakConfig()">
            <button (click)="login()" class="btn btn-primary">Login with Keycloak</button>
          </div>
          
          <div *ngIf="authService.errorMessage()" class="error-message">
            <strong>Error:</strong>
            <pre>{{ authService.errorMessage() }}</pre>
          </div>
        </div>
      </div>
      
      <div *ngIf="authService.isAuthenticated()" class="authenticated-section">
        <div class="status-card">
          <h3>✅ Authentication Successful</h3>
          <p>You are successfully authenticated with Keycloak.</p>
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
    </div>
  `,
  styles: [`
    .auth-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .login-section, .authenticated-section {
      text-align: center;
      padding: 20px;
    }
    
    .status-card {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .status-card h3 {
      color: #28a745;
      margin-bottom: 15px;
    }
    
    .actions {
      margin-top: 20px;
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin: 0 5px;
      font-size: 16px;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-danger {
      background-color: #dc3545;
      color: white;
    }
    
    .btn:hover:not(:disabled) {
      opacity: 0.9;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
      margin-top: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
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
