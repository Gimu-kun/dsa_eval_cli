import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MockDataService } from './services/mock-data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly mockService = inject(MockDataService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.mockService.currentUser;

  protected logout(): void {
    this.mockService.logout();
    this.router.navigate(['/login']);
  }

  protected resetAllData(): void {
    if (confirm('Bạn có chắc chắn muốn khôi phục dữ liệu ban đầu? Lịch sử làm bài của bạn sẽ bị xoá và đặt lại dữ liệu mẫu.')) {
      this.mockService.resetHistory();
      window.location.reload();
    }
  }
}
