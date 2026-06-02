import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../services/mock-data.service';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html'
})
export class AuthComponent {
  private readonly mockService = inject(MockDataService);
  private readonly router = inject(Router);

  // Toggle mode: login vs register
  protected readonly isLoginMode = signal<boolean>(true);
  protected readonly errorMessage = signal<string>('');
  protected readonly isLoading = signal<boolean>(false);

  // Form Fields
  protected username = '';
  protected password = '';
  protected fullName = '';
  protected selectedRole = 'STUDENT'; // STUDENT or ADMIN

  protected toggleMode(): void {
    this.isLoginMode.update(val => !val);
    this.errorMessage.set('');
  }

  protected selectRole(role: string): void {
    this.selectedRole = role;
  }

  protected onSubmit(): void {
    if (!this.username.trim() || !this.password) {
      this.errorMessage.set('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    if (this.username.trim().length < 3) {
      this.errorMessage.set('Tên đăng nhập phải có ít nhất 3 ký tự.');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    if (this.isLoginMode()) {
      // Login flow
      this.mockService.login({ username: this.username.trim(), password: this.password }).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.');
        }
      });
    } else {
      // Register flow
      if (!this.fullName.trim()) {
        this.isLoading.set(false);
        this.errorMessage.set('Vui lòng điền họ và tên.');
        return;
      }

      this.mockService.register({
        username: this.username.trim(),
        password: this.password,
        full_name: this.fullName.trim(),
        role: this.selectedRole
      }).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Đăng ký thất bại. Tên đăng nhập có thể đã được sử dụng.');
        }
      });
    }
  }
}
