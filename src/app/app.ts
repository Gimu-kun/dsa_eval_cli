import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenService } from './services/token.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  protected readonly currentUser = this.tokenService.currentUser;
  protected readonly isKnowledgeDropdownOpen = signal(false);

  protected toggleKnowledgeDropdown(): void {
    this.isKnowledgeDropdownOpen.update(v => !v);
  }

  protected closeKnowledgeDropdown(): void {
    this.isKnowledgeDropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#knowledge-menu')) {
      this.isKnowledgeDropdownOpen.set(false);
    }
  }

  protected logout(): void {
    this.tokenService.clearSession();
    this.router.navigate(['/login']);
  }

  protected resetAllData(): void {
    if (confirm('Bạn có chắc chắn muốn khôi phục dữ liệu ban đầu?')) {
      window.location.reload();
    }
  }
}
