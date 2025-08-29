import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { JWTInspector } from '../../utils/jwt-inspector';

@Component({
  selector: 'app-token-display',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="token-container">
      <h2>Token Information</h2>
      
      <div *ngIf="!authService.isAuthenticated()" class="no-token">
        <p>No tokens available. Please authenticate first.</p>
      </div>
      
      <div *ngIf="authService.isAuthenticated() && authService.tokenInfo()" class="token-sections">
        
        <!-- Token Info Summary -->
        <div class="token-section">
          <div class="section-header" (click)="toggleTokenSummary()">
            <div class="section-title-with-status">
              <h3>Token Summary</h3>
              <span class="validity-label">Valid: 
                <span class="validity-status" [class]="authService.hasValidToken() ? 'valid' : 'invalid'">
                  {{ authService.hasValidToken() ? '✅' : '❌' }}
                </span>
              </span>
            </div>
            <span class="collapse-icon">{{ showTokenSummary ? '▼' : '▶' }}</span>
          </div>
          <div *ngIf="showTokenSummary" class="section-content">
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
            </div>
          </div>
        </div>

        <!-- Enhanced JWT Analysis -->
        <div class="token-section">
          <div class="section-header" (click)="toggleJwtAnalysis()">
            <h3>🔍 JWT Token Analysis</h3>
            <span class="collapse-icon">{{ showJwtAnalysis ? '▼' : '▶' }}</span>
          </div>
          <div *ngIf="showJwtAnalysis" class="section-content">
            <div class="jwt-analysis">
              <div *ngIf="accessTokenAnalysis()" class="analysis-section">
                <h4>Access Token Analysis:</h4>
                <div class="analysis-grid">
                  <div class="analysis-item">
                    <strong>Issuer:</strong> {{ accessTokenAnalysis()?.payload?.iss || 'N/A' }}
                  </div>
                  <div class="analysis-item">
                    <strong>Audience:</strong> {{ accessTokenAnalysis()?.payload?.aud || 'N/A' }}
                  </div>
                  <div class="analysis-item">
                    <strong>Subject:</strong> {{ accessTokenAnalysis()?.payload?.sub || 'N/A' }}
                  </div>
                  <div class="analysis-item">
                    <strong>User ID:</strong> {{ accessTokenAnalysis()?.userId || 'N/A' }}
                  </div>
                  <div class="analysis-item">
                    <strong>Issued At:</strong> {{ accessTokenAnalysis()?.issuedAt || 'N/A' }}
                  </div>
                  <div class="analysis-item">
                    <strong>Expires At:</strong> {{ accessTokenAnalysis()?.expiresAt || 'N/A' }}
                  </div>
                  <div class="analysis-item">
                    <strong>Is Expired:</strong> 
                    <span [class]="accessTokenAnalysis()?.isExpired ? 'invalid' : 'valid'">
                      {{ accessTokenAnalysis()?.isExpired ? 'Yes' : 'No' }}
                    </span>
                  </div>
                  <div class="analysis-item">
                    <strong>Time Until Expiry:</strong> {{ getTimeUntilExpiry(accessTokenAnalysis()?.timeUntilExpiry) }}
                  </div>
                </div>
                
                <div *ngIf="accessTokenAnalysis()?.scopes?.length" class="scopes-section">
                  <strong>Scopes:</strong>
                  <div class="scopes-list">
                    <span *ngFor="let scope of accessTokenAnalysis()?.scopes" class="scope-badge">{{ scope }}</span>
                  </div>
                </div>
                
                <div *ngIf="accessTokenAnalysis()?.roles?.length" class="roles-section">
                  <strong>Roles:</strong>
                  <div class="roles-list">
                    <span *ngFor="let role of accessTokenAnalysis()?.roles" class="role-badge">{{ role }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Access Token -->
        <div class="token-section">
          <div class="section-header" (click)="toggleAccessTokenSection()">
            <h3>Access Token</h3>
            <span class="collapse-icon">{{ showAccessTokenSection ? '▼' : '▶' }}</span>
          </div>
          <div *ngIf="showAccessTokenSection" class="section-content">
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
        </div>
        
        <!-- Refresh Token -->
        <div *ngIf="authService.tokenInfo()?.refresh_token" class="token-section">
          <div class="section-header" (click)="toggleRefreshTokenSection()">
            <h3>Refresh Token</h3>
            <span class="collapse-icon">{{ showRefreshTokenSection ? '▼' : '▶' }}</span>
          </div>
          <div *ngIf="showRefreshTokenSection" class="section-content">
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
        </div>
        
        <!-- ID Token -->
        <div *ngIf="authService.tokenInfo()?.id_token" class="token-section">
          <div class="section-header" (click)="toggleIdTokenSection()">
            <h3>ID Token</h3>
            <span class="collapse-icon">{{ showIdTokenSection ? '▼' : '▶' }}</span>
          </div>
          <div *ngIf="showIdTokenSection" class="section-content">
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
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      padding: 5px 0;
      user-select: none;
      transition: background-color 0.2s ease;
      border-radius: 4px;
    }
    
    .section-header:hover {
      background-color: #f1f3f4;
      padding: 5px 10px;
    }
    
    .section-header h3 {
      margin: 0;
      color: #495057;
      font-size: 1.2em;
    }
    
    .section-title-with-status {
      display: flex;
      align-items: baseline;
      gap: 40px;
    }
    
    .validity-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 1em;
      color: #6c757d;
      font-weight: bold;
    }
    
    .validity-status {
      font-size: 16px;
      display: flex;
      align-items: center;
    }
    
    .validity-status.valid {
      color: #28a745;
    }
    
    .validity-status.invalid {
      color: #dc3545;
    }
    
    .collapse-icon {
      font-size: 14px;
      color: #6c757d;
      transition: transform 0.2s ease;
      margin-left: 10px;
    }
    
    .section-content {
      margin-top: 15px;
      animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
      }
      to {
        opacity: 1;
        max-height: 2000px;
        overflow: visible;
      }
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

    /* JWT Analysis Styles */
    .jwt-analysis {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
    }

    .analysis-section {
      margin-bottom: 20px;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 10px;
      margin: 15px 0;
    }

    .analysis-item {
      padding: 8px 12px;
      background-color: white;
      border-radius: 3px;
      border-left: 3px solid #007bff;
    }

    .scopes-section, .roles-section {
      margin-top: 15px;
    }

    .scopes-list, .roles-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 5px;
    }

    .scope-badge, .role-badge {
      background-color: #007bff;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .role-badge {
      background-color: #28a745;
    }
  `]
})
export class TokenDisplayComponent {
  showAccessToken = false;
  showRefreshToken = false;
  showIdToken = false;
  copyMessage = '';
  
  // Section collapse states
  showTokenSummary = true;
  showJwtAnalysis = false;
  showAccessTokenSection = false;
  showRefreshTokenSection = false;
  showIdTokenSection = false;

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

  readonly accessTokenAnalysis = computed(() => {
    const token = this.authService.tokenInfo()?.access_token;
    return token ? JWTInspector.inspect(token) : null;
  });

  constructor(public authService: AuthService) {}

  toggleTokenSummary(): void {
    this.showTokenSummary = !this.showTokenSummary;
  }

  toggleJwtAnalysis(): void {
    this.showJwtAnalysis = !this.showJwtAnalysis;
  }

  toggleAccessTokenSection(): void {
    this.showAccessTokenSection = !this.showAccessTokenSection;
  }

  toggleRefreshTokenSection(): void {
    this.showRefreshTokenSection = !this.showRefreshTokenSection;
  }

  toggleIdTokenSection(): void {
    this.showIdTokenSection = !this.showIdTokenSection;
  }

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

  getTimeUntilExpiry(timeMs: number | null): string {
    if (!timeMs) return 'N/A';
    
    const minutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }
}
