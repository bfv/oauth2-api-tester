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
  styleUrls: ['./api-test.component.css'],
  templateUrl: './api-test.component.html',
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
