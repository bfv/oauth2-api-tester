import { Routes } from '@angular/router';
import { ConfigComponent } from './components/config/config.component';
import { AuthComponent } from './components/auth/auth.component';
import { TokenDisplayComponent } from './components/token-display/token-display.component';
import { ApiTestComponent } from './components/api-test/api-test.component';

export const routes: Routes = [
  { path: '', redirectTo: '/auth', pathMatch: 'full' },
  { path: 'config', component: ConfigComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'tokens', component: TokenDisplayComponent },
  { path: 'api-test', component: ApiTestComponent },
  { path: '**', redirectTo: '/auth' }
];
