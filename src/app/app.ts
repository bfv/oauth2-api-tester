import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ConfigService } from './services/config.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Oauth2 API Tester');
  protected readonly version = environment.version;

  constructor(
    public authService: AuthService,
    public configService: ConfigService,
    private router: Router
  ) {}

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
