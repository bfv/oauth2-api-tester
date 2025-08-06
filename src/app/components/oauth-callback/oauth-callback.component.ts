import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="callback-status">
        <h2>🔄 Processing OAuth Callback</h2>
        <p>{{ statusMessage }}</p>
        <div *ngIf="showError" class="error-message">
          <p>{{ errorMessage }}</p>
          <button (click)="goToAuth()" class="btn btn-primary">Go to Authentication</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f8f9fa;
    }
    
    .callback-status {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 500px;
    }
    
    .error-message {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f1aeb5;
      border-radius: 5px;
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      text-decoration: none;
      display: inline-block;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #0056b3;
    }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  statusMessage = 'Processing OAuth callback...';
  errorMessage = '';
  showError = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.handleCallback();
  }

  private async handleCallback(): Promise<void> {
    try {
      // Get the current URL with all parameters
      const currentUrl = window.location.href;
      const urlObj = new URL(currentUrl);
      
      // Check if this is an OAuth callback (has 'code' or 'error' parameter)
      const hasCode = urlObj.searchParams.has('code');
      const hasError = urlObj.searchParams.has('error');
      
      if (!hasCode && !hasError) {
        throw new Error('This does not appear to be a valid OAuth callback URL. Missing required parameters.');
      }

      if (hasError) {
        const error = urlObj.searchParams.get('error');
        const errorDescription = urlObj.searchParams.get('error_description');
        throw new Error(`OAuth Error: ${error} - ${errorDescription}`);
      }
      
      this.statusMessage = 'OAuth callback detected. Processing authentication...';
      
      // Check if we have stored custom redirect information
      const customRedirect = sessionStorage.getItem('oauth_custom_redirect');
      
      if (customRedirect) {
        console.log('Processing OAuth callback with custom redirect URI:', customRedirect);
        
        // Since we intercepted the OAuth flow, we need to manually process the callback
        // The OAuth service should handle this automatically when we navigate to /auth
        this.statusMessage = 'Redirecting to authentication page...';
        
        // Clean up session storage
        sessionStorage.removeItem('oauth_custom_redirect');
        sessionStorage.removeItem('oauth_original_redirect');
        
        // Navigate to the auth page with all OAuth parameters
        await this.router.navigate(['/auth'], { 
          queryParams: Object.fromEntries(urlObj.searchParams.entries()),
          fragment: urlObj.hash ? urlObj.hash.substring(1) : undefined
        });
      } else {
        // Regular callback processing
        this.statusMessage = 'Processing OAuth callback...';
        
        // Navigate to auth page with parameters
        await this.router.navigate(['/auth'], { 
          queryParams: Object.fromEntries(urlObj.searchParams.entries()),
          fragment: urlObj.hash ? urlObj.hash.substring(1) : undefined
        });
      }
      
    } catch (error) {
      console.error('Error processing OAuth callback:', error);
      this.showError = true;
      this.errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  goToAuth(): void {
    this.router.navigate(['/auth']);
  }
}
