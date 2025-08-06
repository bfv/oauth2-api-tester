import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';
import { AuthService } from '../../services/auth.service';
import { KeycloakConfig, ApiConfig } from '../../models/config.model';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-container">
      <h2>Configuration</h2>
      
      <div class="config-section">
        <h3>Keycloak Configuration</h3>
        <form (ngSubmit)="saveKeycloakConfig()" #kcForm="ngForm">
          <div class="form-group">
            <label for="issuer">Issuer URL:</label>
            <input 
              type="text" 
              id="issuer" 
              name="issuer"
              [(ngModel)]="keycloakConfig.issuer" 
              placeholder="http://localhost:8080/realms/master"
              required>
          </div>
          
          <div class="form-group">
            <label for="clientId">Client ID:</label>
            <input 
              type="text" 
              id="clientId" 
              name="clientId"
              [(ngModel)]="keycloakConfig.clientId" 
              placeholder="jwt-client"
              required>
          </div>
          
          <div class="form-group">
            <label for="redirectUri">Redirect URI:</label>
            <input 
              type="text" 
              id="redirectUri" 
              name="redirectUri"
              [(ngModel)]="keycloakConfig.redirectUri" 
              [placeholder]="currentOrigin">
          </div>
          
          <div class="form-group">
            <label for="scope">Scope:</label>
            <input 
              type="text" 
              id="scope" 
              name="scope"
              [(ngModel)]="keycloakConfig.scope" 
              placeholder="openid profile email">
          </div>
          
          <button type="submit" [disabled]="!kcForm.form.valid" class="btn btn-primary">
            Save Keycloak Config
          </button>
          <button type="button" (click)="exportKeycloakConfig()" class="btn btn-secondary">
            Export Config
          </button>
          <button type="button" (click)="triggerImportKeycloakConfig()" class="btn btn-secondary">
            Import Config
          </button>
          <input type="file" #fileInput (change)="importKeycloakConfig($event)" accept=".json" style="display: none;">
          <div class="help-text">
            <small>💡 Export creates a JSON file with your configuration. Import automatically loads and saves the configuration locally. Modern browsers (Chrome/Edge) will show a save dialog for export, others will prompt for filename.</small>
          </div>
        </form>
      </div>
      
      <div class="config-section">
        <h3>API Configuration</h3>
        <form (ngSubmit)="saveApiConfig()" #apiForm="ngForm">
          <div class="form-group">
            <label for="baseUrl">Base URL:</label>
            <input 
              type="text" 
              id="baseUrl" 
              name="baseUrl"
              [(ngModel)]="apiConfig.baseUrl" 
              placeholder="http://localhost:8810"
              required>
          </div>
          
          <div class="endpoints-section">
            <h4>Endpoints:</h4>
            <div class="endpoint-item" *ngFor="let endpoint of endpointEntries; trackBy: trackByIndex">
              <input 
                type="text" 
                [(ngModel)]="endpoint.name" 
                name="endpoint-name-{{endpoint.id}}"
                placeholder="Endpoint Name"
                class="endpoint-name">
              <input 
                type="text" 
                [(ngModel)]="endpoint.path" 
                name="endpoint-path-{{endpoint.id}}"
                placeholder="/path/to/endpoint"
                class="endpoint-path">
              <button type="button" (click)="removeEndpoint(endpoint.id)" class="btn btn-danger btn-sm">Remove</button>
            </div>
            
            <button type="button" (click)="addEndpoint()" class="btn btn-secondary btn-sm">Add Endpoint</button>
          </div>
          
          <button type="submit" [disabled]="!apiForm.form.valid" class="btn btn-primary">
            Save API Config
          </button>
        </form>
      </div>
      
      <div class="config-section">
        <h3>Actions</h3>
        <button (click)="loadDefaults()" class="btn btn-secondary">Load Defaults</button>
        <button (click)="clearConfig()" class="btn btn-danger">Clear All Config</button>
      </div>
      
      <div *ngIf="message()" class="message" [class]="messageType()">
        {{ message() }}
      </div>
    </div>
  `,
  styles: [`
    .config-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .config-section {
      margin-bottom: 30px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
      background-color: #f9f9f9;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    input[type="text"] {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 3px;
      box-sizing: border-box;
    }
    
    .endpoints-section {
      margin-top: 15px;
    }
    
    .endpoint-item {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      align-items: center;
    }
    
    .endpoint-name {
      flex: 0 0 200px;
    }
    
    .endpoint-path {
      flex: 1;
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      margin-right: 10px;
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
    
    .help-text {
      margin-top: 10px;
      padding: 8px;
      background-color: #f8f9fa;
      border-left: 3px solid #007bff;
      border-radius: 3px;
    }
    
    .help-text small {
      color: #6c757d;
      font-style: italic;
    }
    
    .message {
      padding: 10px;
      border-radius: 3px;
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
export class ConfigComponent {
  keycloakConfig!: KeycloakConfig;
  apiConfig!: ApiConfig;
  endpointEntries: Array<{id: number, name: string, path: string}> = [];
  currentOrigin = window.location.origin;
  private nextId = 1;
  
  message = signal('');
  messageType = signal('success');

  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    this.loadCurrentConfig();
  }

  private loadCurrentConfig(): void {
    const savedConfig = this.configService.getConfig();
    
    this.keycloakConfig = savedConfig?.keycloak || this.configService.getDefaultKeycloakConfig();
    this.apiConfig = savedConfig?.api || this.configService.getDefaultApiConfig();
    
    this.updateEndpointEntries();
  }

  private updateEndpointEntries(): void {
    this.endpointEntries = Object.entries(this.apiConfig.endpoints || {})
      .map(([name, path]) => ({
        id: this.nextId++,
        name,
        path
      }));
      
    if (this.endpointEntries.length === 0) {
      this.addEndpoint();
    }
  }

  saveKeycloakConfig(): void {
    this.configService.saveKeycloakConfig(this.keycloakConfig);
    this.authService.configureAuth(this.keycloakConfig);
    this.showMessage('Keycloak configuration saved successfully!', 'success');
  }

  saveApiConfig(): void {
    // Convert endpoint entries back to the config format
    this.apiConfig.endpoints = {};
    this.endpointEntries.forEach(entry => {
      if (entry.name && entry.path) {
        this.apiConfig.endpoints[entry.name] = entry.path;
      }
    });
    
    this.configService.saveApiConfig(this.apiConfig);
    this.showMessage('API configuration saved successfully!', 'success');
  }

  addEndpoint(): void {
    this.endpointEntries.push({
      id: this.nextId++,
      name: '',
      path: ''
    });
  }

  removeEndpoint(id: number): void {
    this.endpointEntries = this.endpointEntries.filter(entry => entry.id !== id);
  }

  trackByIndex(index: number): number {
    return index;
  }

  loadDefaults(): void {
    this.keycloakConfig = this.configService.getDefaultKeycloakConfig();
    this.apiConfig = this.configService.getDefaultApiConfig();
    this.updateEndpointEntries();
    this.showMessage('Default configuration loaded', 'success');
  }

  clearConfig(): void {
    this.configService.clearConfig();
    this.loadCurrentConfig();
    this.showMessage('Configuration cleared', 'success');
  }

  exportKeycloakConfig(): void {
    try {
      // Get realm name from issuer URL for a more descriptive filename
      const realmName = this.keycloakConfig.issuer.split('/realms/').pop() || 'config';
      const defaultFilename = `${realmName}-keycloak-config-${new Date().toISOString().split('T')[0]}.json`;
      
      const configToExport = {
        keycloak: this.keycloakConfig,
        api: this.apiConfig,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        description: `Configuration for ${this.keycloakConfig.issuer} - Client: ${this.keycloakConfig.clientId}`
      };
      
      const dataStr = JSON.stringify(configToExport, null, 2);
      
      // Try to use File System Access API if supported (Chrome/Edge)
      if ('showSaveFilePicker' in window) {
        this.saveWithNativeDialog(dataStr, defaultFilename);
      } else {
        // Fallback to traditional download with filename prompt
        this.saveWithPrompt(dataStr, defaultFilename);
      }
      
    } catch (error) {
      this.showMessage(`Export failed: ${error}`, 'error');
    }
  }
  
  private async saveWithNativeDialog(dataStr: string, defaultFilename: string): Promise<void> {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: defaultFilename,
        types: [{
          description: 'JSON files',
          accept: {
            'application/json': ['.json']
          }
        }]
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(dataStr);
      await writable.close();
      
      this.showMessage(`Configuration saved successfully to "${fileHandle.name}"!`, 'success');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.showMessage('Save cancelled by user', 'error');
      } else {
        this.showMessage(`Save failed: ${error}`, 'error');
      }
    }
  }
  
  private saveWithPrompt(dataStr: string, defaultFilename: string): void {
    // Prompt user for filename
    const filename = prompt('Enter filename for the configuration export:', defaultFilename);
    
    if (!filename) {
      // User cancelled the save
      this.showMessage('Export cancelled', 'error');
      return;
    }
    
    // Ensure filename has .json extension
    const finalFilename = filename.endsWith('.json') ? filename : filename + '.json';
    
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', finalFilename);
    linkElement.click();
    
    this.showMessage(`Configuration exported successfully as "${finalFilename}"!`, 'success');
  }

  triggerImportKeycloakConfig(): void {
    // Trigger the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  importKeycloakConfig(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      this.showMessage('Please select a valid JSON file', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedConfig = JSON.parse(content);
        
        // Validate the imported configuration
        if (!importedConfig.keycloak || !importedConfig.keycloak.issuer || !importedConfig.keycloak.clientId) {
          this.showMessage('Invalid configuration file: missing required Keycloak settings', 'error');
          return;
        }
        
        // Import the configuration
        this.keycloakConfig = {
          issuer: importedConfig.keycloak.issuer,
          clientId: importedConfig.keycloak.clientId,
          redirectUri: importedConfig.keycloak.redirectUri || '',
          scope: importedConfig.keycloak.scope || 'openid profile email'
        };
        
        if (importedConfig.api) {
          this.apiConfig = {
            baseUrl: importedConfig.api.baseUrl || '',
            endpoints: importedConfig.api.endpoints || {}
          };
          this.updateEndpointEntries();
        }
        
        // Automatically save the imported configuration locally
        this.configService.saveKeycloakConfig(this.keycloakConfig);
        this.authService.configureAuth(this.keycloakConfig);
        
        if (importedConfig.api) {
          // Convert endpoint entries back to the config format for saving
          const endpointsToSave: { [key: string]: string } = {};
          Object.entries(this.apiConfig.endpoints || {}).forEach(([name, path]) => {
            if (name && path) {
              endpointsToSave[name] = path as string;
            }
          });
          this.apiConfig.endpoints = endpointsToSave;
          this.configService.saveApiConfig(this.apiConfig);
        }
        
        this.showMessage(`Configuration imported and saved successfully! (exported: ${importedConfig.exportedAt || 'unknown'})`, 'success');
        
        // Clear the file input
        input.value = '';
        
      } catch (error) {
        this.showMessage(`Import failed: Invalid JSON file - ${error}`, 'error');
        input.value = '';
      }
    };
    
    reader.onerror = () => {
      this.showMessage('Failed to read file', 'error');
      input.value = '';
    };
    
    reader.readAsText(file);
  }

  private showMessage(text: string, type: 'success' | 'error'): void {
    this.message.set(text);
    this.messageType.set(type);
    
    setTimeout(() => {
      this.message.set('');
    }, 3000);
  }
}
