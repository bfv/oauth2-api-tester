import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-token-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="token-container">
      <h2>Token Information</h2>
      
      <div *ngIf="!authService.isAuthenticated()" class="no-token">
        <p>No tokens available. Please authenticate first.</p>
      </div>
      
      <div *ngIf="authService.isAuthenticated() && authService.tokenInfo()" class="token-sections">
        
        <!-- Token Info Summary -->
        <div class="token-section">
          <h3>Token Summary</h3>
          <div class="token-summary">
            <div class="summary-item">
              <strong>Type:</strong> {{ authService.tokenInfo()?.token_type }}
            </div>
            <div class="summary-item">
              <strong>Expires In:</strong> {{ getExpiresInMinutes() }} minutes
            </div>
            <div class="summary-item">
              <strong>Scope:</strong> {{ authService.tokenInfo()?.scope || 'N/A' }}
            </div>
            <div class="summary-item">
              <strong>Valid:</strong> 
              <span [class]="authService.hasValidToken() ? 'valid' : 'invalid'">
                {{ authService.hasValidToken() ? 'Yes' : 'No' }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Access Token -->
        <div class="token-section">
          <h3>Access Token</h3>
          <div class="token-controls">
            <button (click)="toggleAccessTokenView()" class="btn btn-secondary">
              {{ showAccessToken ? 'Hide' : 'Show' }} Raw Token
            </button>
            <button (click)="copyToClipboard(authService.tokenInfo()?.access_token || '')" class="btn btn-primary">
              Copy Token
            </button>
          </div>
          
          <div *ngIf="showAccessToken" class="token-raw">
            <h4>Raw Token:</h4>
            <textarea readonly class="token-textarea">{{ authService.tokenInfo()?.access_token }}</textarea>
          </div>
          
          <div class="token-decoded">
            <h4>Decoded Token:</h4>
            <div *ngIf="decodedAccessToken()">
              <div class="decoded-section">
                <h5>Header:</h5>
                <pre>{{ formatJson(decodedAccessToken()?.header) }}</pre>
              </div>
              <div class="decoded-section">
                <h5>Payload:</h5>
                <pre>{{ formatJson(decodedAccessToken()?.payload) }}</pre>
              </div>
            </div>
            <div *ngIf="!decodedAccessToken()" class="decode-error">
              Failed to decode access token
            </div>
          </div>
        </div>
        
        <!-- Refresh Token -->
        <div *ngIf="authService.tokenInfo()?.refresh_token" class="token-section">
          <h3>Refresh Token</h3>
          <div class="token-controls">
            <button (click)="toggleRefreshTokenView()" class="btn btn-secondary">
              {{ showRefreshToken ? 'Hide' : 'Show' }} Raw Token
            </button>
            <button (click)="copyToClipboard(authService.tokenInfo()?.refresh_token || '')" class="btn btn-primary">
              Copy Token
            </button>
          </div>
          
          <div *ngIf="showRefreshToken" class="token-raw">
            <h4>Raw Token:</h4>
            <textarea readonly class="token-textarea">{{ authService.tokenInfo()?.refresh_token }}</textarea>
          </div>
          
          <div class="token-decoded">
            <h4>Decoded Token:</h4>
            <div *ngIf="decodedRefreshToken()">
              <div class="decoded-section">
                <h5>Header:</h5>
                <pre>{{ formatJson(decodedRefreshToken()?.header) }}</pre>
              </div>
              <div class="decoded-section">
                <h5>Payload:</h5>
                <pre>{{ formatJson(decodedRefreshToken()?.payload) }}</pre>
              </div>
            </div>
            <div *ngIf="!decodedRefreshToken()" class="decode-error">
              Failed to decode refresh token
            </div>
          </div>
        </div>
        
        <!-- ID Token -->
        <div *ngIf="authService.tokenInfo()?.id_token" class="token-section">
          <h3>ID Token</h3>
          <div class="token-controls">
            <button (click)="toggleIdTokenView()" class="btn btn-secondary">
              {{ showIdToken ? 'Hide' : 'Show' }} Raw Token
            </button>
            <button (click)="copyToClipboard(authService.tokenInfo()?.id_token || '')" class="btn btn-primary">
              Copy Token
            </button>
          </div>
          
          <div *ngIf="showIdToken" class="token-raw">
            <h4>Raw Token:</h4>
            <textarea readonly class="token-textarea">{{ authService.tokenInfo()?.id_token }}</textarea>
          </div>
          
          <div class="token-decoded">
            <h4>Decoded Token:</h4>
            <div *ngIf="decodedIdToken()">
              <div class="decoded-section">
                <h5>Header:</h5>
                <pre>{{ formatJson(decodedIdToken()?.header) }}</pre>
              </div>
              <div class="decoded-section">
                <h5>Payload:</h5>
                <pre>{{ formatJson(decodedIdToken()?.payload) }}</pre>
              </div>
            </div>
            <div *ngIf="!decodedIdToken()" class="decode-error">
              Failed to decode ID token
            </div>
          </div>
        </div>
      </div>
      
      <div *ngIf="copyMessage" class="copy-message">
        {{ copyMessage }}
      </div>
    </div>
  `,
  styles: [`
    .token-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .no-token {
      text-align: center;
      padding: 40px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    
    .token-sections {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .token-section {
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      background-color: #fff;
    }
    
    .token-section h3 {
      margin-top: 0;
      color: #495057;
    }
    
    .token-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .summary-item {
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }
    
    .valid {
      color: #28a745;
      font-weight: bold;
    }
    
    .invalid {
      color: #dc3545;
      font-weight: bold;
    }
    
    .token-controls {
      margin-bottom: 15px;
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
      font-size: 14px;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn:hover {
      opacity: 0.9;
    }
    
    .token-raw {
      margin-bottom: 20px;
    }
    
    .token-textarea {
      width: 100%;
      height: 120px;
      padding: 10px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      resize: vertical;
      word-break: break-all;
    }
    
    .decoded-section {
      margin-bottom: 20px;
    }
    
    .decoded-section h5 {
      margin-bottom: 10px;
      color: #6c757d;
    }
    
    pre {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 15px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.4;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .decode-error {
      color: #dc3545;
      font-style: italic;
      padding: 10px;
      background-color: #f8d7da;
      border-radius: 4px;
    }
    
    .copy-message {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #28a745;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
    }
    
    @media (max-width: 768px) {
      .token-summary {
        grid-template-columns: 1fr;
      }
      
      .token-container {
        padding: 10px;
      }
      
      pre {
        font-size: 10px;
      }
    }
  `]
})
export class TokenDisplayComponent {
  showAccessToken = false;
  showRefreshToken = false;
  showIdToken = false;
  copyMessage = '';

  readonly decodedAccessToken = computed(() => {
    const token = this.authService.tokenInfo()?.access_token;
    return token ? this.authService.getDecodedToken(token) : null;
  });

  readonly decodedRefreshToken = computed(() => {
    const token = this.authService.tokenInfo()?.refresh_token;
    return token ? this.authService.getDecodedToken(token) : null;
  });

  readonly decodedIdToken = computed(() => {
    const token = this.authService.tokenInfo()?.id_token;
    return token ? this.authService.getDecodedToken(token) : null;
  });

  constructor(public authService: AuthService) {}

  toggleAccessTokenView(): void {
    this.showAccessToken = !this.showAccessToken;
  }

  toggleRefreshTokenView(): void {
    this.showRefreshToken = !this.showRefreshToken;
  }

  toggleIdTokenView(): void {
    this.showIdToken = !this.showIdToken;
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copyMessage = 'Token copied to clipboard!';
      setTimeout(() => {
        this.copyMessage = '';
      }, 2000);
    } catch (err) {
      this.copyMessage = 'Failed to copy token';
      setTimeout(() => {
        this.copyMessage = '';
      }, 2000);
    }
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  getExpiresInMinutes(): number {
    const expiresIn = this.authService.tokenInfo()?.expires_in;
    return expiresIn ? Math.floor(expiresIn / 1000 / 60) : 0;
  }
}
