import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ConfigService } from './services/config.service';

@Injectable({ providedIn: 'root' })
export class AuthConfigGuard implements CanActivate {
  constructor(private configService: ConfigService, private router: Router) {}

  canActivate(): boolean {
    if (this.configService.hasOAuthConfig()) {
      return true;
    } else {
      this.router.navigate(['/config']);
      return false;
    }
  }
}
