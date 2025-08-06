import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Keycloak JWT Client');

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
