import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserSession } from '../models/dsa-models';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  public readonly currentUser = signal<UserSession | null>(null);

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem('dsa_user_session');
      if (stored) {
        try {
          this.currentUser.set(JSON.parse(stored));
        } catch (e) {
          localStorage.removeItem('dsa_user_session');
        }
      }
    }
  }

  public setSession(session: UserSession | null): void {
    this.currentUser.set(session);
    if (this.isBrowser) {
      if (session) {
        localStorage.setItem('dsa_user_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('dsa_user_session');
      }
    }
  }

  public clearSession(): void {
    this.currentUser.set(null);
    if (this.isBrowser) {
      localStorage.removeItem('dsa_user_session');
    }
  }

  public isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }
}
