import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ConfigService } from '../../services/config.service';
import { AuthService } from '../../services/auth.service';
import { ApiRequest, ApiResponse } from '../../models/api.model';

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="api-test-container">
      <h2>API Test</h2>
      
      <div *ngIf="!authService.isAuthenticated()" class="no-auth">
        <p>Please authenticate first to test API endpoints.</p>
      </div>
      
      <div *ngIf="authService.isAuthenticated()" class="api-test-form">
        
        <!-- Request Configuration -->
        <div class="request-section">
          <h3>Request Configuration</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="method">HTTP Method:</label>
              <select id="method" [(ngModel)]="request.method" name="method">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            
            <div class="form-group url-group">
              <label for="url">URL:</label>
              <div class="url-input-group">
                <input 
                  type="text" 
                  id="baseUrl" 
                  [(ngModel)]="baseUrl" 
                  name="baseUrl"
                  placeholder="Base URL"
                  class="base-url-input">
                <select 
                  [(ngModel)]="selectedEndpoint" 
                  name="selectedEndpoint"
                  (ngModelChange)="onEndpointChange()"
                  class="endpoint-select">
                  <option value="">Select Endpoint</option>
                  <option *ngFor="let endpoint of availableEndpoints" [value]="endpoint.path">
                    {{ endpoint.name }}
                  </option>
                </select>
                <input 
                  type="text" 
                  id="customPath" 
                  [(ngModel)]="customPath" 
                  name="customPath"
                  (ngModelChange)="updateFullUrl()"
                  placeholder="Or enter custom path"
                  class="custom-path-input">
              </div>
              <div class="full-url">
                <strong>Full URL:</strong> {{ request.url }}
              </div>
            </div>
          </div>
          
          <!-- Request Body (for POST/PUT) -->
          <div *ngIf="request.method === 'POST' || request.method === 'PUT'" class="form-group">
            <label for="body">Request Body (JSON):</label>
            <textarea 
              id="body" 
              [(ngModel)]="requestBodyText" 
              name="body"
              rows="6"
              placeholder='{"example": "data"}'
              class="json-textarea"></textarea>
          </div>
          
          <!-- Custom Headers -->
          <div class="form-group">
            <label>Custom Headers:</label>
            <div class="headers-section">
              <div class="header-item" *ngFor="let header of customHeaders; trackBy: trackByIndex">
                <input 
                  type="text" 
                  [(ngModel)]="header.key" 
                  name="header-key-{{header.id}}"
                  placeholder="Header Name"
                  class="header-key">
                <input 
                  type="text" 
                  [(ngModel)]="header.value" 
                  name="header-value-{{header.id}}"
                  placeholder="Header Value"
                  class="header-value">
                <button type="button" (click)="removeHeader(header.id)" class="btn btn-danger btn-sm">Remove</button>
              </div>
              <button type="button" (click)="addHeader()" class="btn btn-secondary btn-sm">Add Header</button>
            </div>
          </div>
          
          <!-- Send Request -->
          <div class="form-actions">
            <button (click)="sendRequest()" [disabled]="loading" class="btn btn-primary">
              {{ loading ? 'Sending...' : 'Send Request' }}
            </button>
            <button (click)="clearResponse()" class="btn btn-secondary">Clear Response</button>
          </div>
        </div>
        
        <!-- Response Section -->
        <div *ngIf="response() || error()" class="response-section">
          <h3>Response</h3>
          
          <div *ngIf="error()" class="error-response">
            <h4>Error:</h4>
            <pre>{{ error() }}</pre>
          </div>
          
          <div *ngIf="response()" class="success-response">
            <div class="response-meta">
              <div class="meta-item">
                <strong>Status:</strong> 
                <span [class]="getStatusClass(response()!.status)">
                  {{ response()!.status }} {{ response()!.statusText }}
                </span>
              </div>
              <div class="meta-item">
                <strong>Duration:</strong> {{ requestDuration }}ms
              </div>
            </div>
            
            <div class="response-headers" *ngIf="response()!.headers && hasHeaders(response()!.headers)">
              <h4>Response Headers:</h4>
              <pre>{{ formatJson(response()!.headers) }}</pre>
            </div>
            
            <div class="response-body">
              <h4>Response Body:</h4>
              <div class="response-controls">
                <button (click)="togglePrettyJson()" class="btn btn-sm btn-secondary">
                  {{ prettyJson ? 'Raw' : 'Pretty' }} JSON
                </button>
                <button (click)="copyResponse()" class="btn btn-sm btn-primary">Copy Response</button>
              </div>
              
              <pre [class]="'response-content ' + (prettyJson ? 'pretty' : 'raw')">{{ getFormattedResponse() }}</pre>
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
    .api-test-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .no-auth {
      text-align: center;
      padding: 40px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    
    .request-section, .response-section {
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      background-color: #fff;
    }
    
    .request-section h3, .response-section h3 {
      margin-top: 0;
      color: #495057;
    }
    
    .form-row {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      align-items: flex-start;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .url-group {
      flex: 1;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    input, select, textarea {
      padding: 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
    }
    
    select {
      width: 150px;
    }
    
    .url-input-group {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .base-url-input {
      flex: 0 0 200px;
    }
    
    .endpoint-select {
      flex: 0 0 200px;
    }
    
    .custom-path-input {
      flex: 1;
    }
    
    .full-url {
      padding: 8px;
      background-color: #f8f9fa;
      border-radius: 4px;
      font-family: monospace;
      word-break: break-all;
    }
    
    .json-textarea {
      width: 100%;
      font-family: monospace;
      resize: vertical;
    }
    
    .headers-section {
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 15px;
      background-color: #f8f9fa;
    }
    
    .header-item {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      align-items: center;
    }
    
    .header-key {
      flex: 0 0 200px;
    }
    
    .header-value {
      flex: 1;
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
    
    .btn-danger {
      background-color: #dc3545;
      color: white;
    }
    
    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .form-actions {
      margin-top: 20px;
    }
    
    .response-meta {
      display: flex;
      gap: 30px;
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    
    .meta-item {
      font-size: 14px;
    }
    
    .status-success {
      color: #28a745;
      font-weight: bold;
    }
    
    .status-error {
      color: #dc3545;
      font-weight: bold;
    }
    
    .status-warning {
      color: #ffc107;
      font-weight: bold;
    }
    
    .response-controls {
      margin-bottom: 10px;
    }
    
    .response-content {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 15px;
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.4;
    }
    
    .error-response pre {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f1aeb5;
      padding: 15px;
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
      .form-row {
        flex-direction: column;
      }
      
      .url-input-group {
        flex-direction: column;
      }
      
      .base-url-input, .endpoint-select, .custom-path-input {
        flex: none;
        width: 100%;
      }
      
      .response-meta {
        flex-direction: column;
        gap: 10px;
      }
    }
  `]
})
export class ApiTestComponent {
  request: ApiRequest = {
    url: '',
    method: 'GET',
    body: null,
    headers: {}
  };
  
  baseUrl = '';
  selectedEndpoint = '';
  customPath = '';
  requestBodyText = '';
  customHeaders: Array<{id: number, key: string, value: string}> = [];
  availableEndpoints: Array<{name: string, path: string}> = [];
  
  loading = false;
  requestDuration = 0;
  prettyJson = true;
  copyMessage = '';
  
  response = signal<ApiResponse | null>(null);
  error = signal<string>('');
  
  private nextId = 1;

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    public authService: AuthService
  ) {
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    const apiConfig = this.configService.getApiConfig();
    if (apiConfig) {
      this.baseUrl = apiConfig.baseUrl;
      this.availableEndpoints = Object.entries(apiConfig.endpoints || {})
        .map(([name, path]) => ({ name, path }));
    }
    
    this.updateFullUrl();
  }

  onEndpointChange(): void {
    if (this.selectedEndpoint) {
      this.customPath = this.selectedEndpoint;
    }
    this.updateFullUrl();
  }

  updateFullUrl(): void {
    const path = this.customPath.startsWith('/') ? this.customPath : '/' + this.customPath;
    this.request.url = this.baseUrl + (this.customPath ? path : '');
  }

  addHeader(): void {
    this.customHeaders.push({
      id: this.nextId++,
      key: '',
      value: ''
    });
  }

  removeHeader(id: number): void {
    this.customHeaders = this.customHeaders.filter(header => header.id !== id);
  }

  trackByIndex(index: number): number {
    return index;
  }

  async sendRequest(): Promise<void> {
    this.loading = true;
    this.error.set('');
    this.response.set(null);
    
    try {
      // Prepare request body
      if (this.request.method === 'POST' || this.request.method === 'PUT') {
        if (this.requestBodyText.trim()) {
          try {
            this.request.body = JSON.parse(this.requestBodyText);
          } catch (e) {
            this.error.set('Invalid JSON in request body');
            this.loading = false;
            return;
          }
        } else {
          this.request.body = null;
        }
      }
      
      // Prepare custom headers
      this.request.headers = {};
      this.customHeaders.forEach(header => {
        if (header.key && header.value) {
          this.request.headers![header.key] = header.value;
        }
      });
      
      const startTime = Date.now();
      
      this.apiService.makeRequest(this.request).subscribe({
        next: (response) => {
          this.requestDuration = Date.now() - startTime;
          this.response.set(response);
          this.loading = false;
        },
        error: (err) => {
          this.requestDuration = Date.now() - startTime;
          this.error.set(`Request failed: ${err.message || err}`);
          this.loading = false;
        }
      });
      
    } catch (err) {
      this.error.set(`Request preparation failed: ${err}`);
      this.loading = false;
    }
  }

  clearResponse(): void {
    this.response.set(null);
    this.error.set('');
    this.requestDuration = 0;
  }

  getStatusClass(status: number): string {
    if (status >= 200 && status < 300) {
      return 'status-success';
    } else if (status >= 400 && status < 600) {
      return 'status-error';
    } else {
      return 'status-warning';
    }
  }

  hasHeaders(headers: any): boolean {
    return Object.keys(headers || {}).length > 0;
  }

  togglePrettyJson(): void {
    this.prettyJson = !this.prettyJson;
  }

  getFormattedResponse(): string {
    const resp = this.response();
    if (!resp) return '';
    
    if (this.prettyJson && typeof resp.body === 'object') {
      return JSON.stringify(resp.body, null, 2);
    }
    
    return typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body);
  }

  async copyResponse(): Promise<void> {
    const resp = this.response();
    if (!resp) return;
    
    try {
      const textToCopy = this.getFormattedResponse();
      await navigator.clipboard.writeText(textToCopy);
      this.copyMessage = 'Response copied to clipboard!';
      setTimeout(() => {
        this.copyMessage = '';
      }, 2000);
    } catch (err) {
      this.copyMessage = 'Failed to copy response';
      setTimeout(() => {
        this.copyMessage = '';
      }, 2000);
    }
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}
