import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserSession } from '../models/dsa-models';

const COOKIE_NAME = 'dsa_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  public readonly currentUser = signal<UserSession | null>(null);

  constructor() {
    if (this.isBrowser) {
      const session = this.readCookie();
      if (session) {
        this.currentUser.set(session);
      }
    }
  }

  public setSession(session: UserSession | null): void {
    this.currentUser.set(session);
    if (this.isBrowser) {
      if (session) {
        this.writeCookie(session);
      } else {
        this.deleteCookie();
      }
    }
  }

  public clearSession(): void {
    this.currentUser.set(null);
    if (this.isBrowser) {
      this.deleteCookie();
    }
  }

  public isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  public getToken(): string | null {
    return this.currentUser()?.token ?? null;
  }

  // ---- Cookie helpers ----

  private writeCookie(session: UserSession): void {
    const value = encodeURIComponent(JSON.stringify(session));
    document.cookie =
      `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Strict`;
  }

  private readCookie(): UserSession | null {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(match.split('=').slice(1).join('=')));
    } catch {
      return null;
    }
  }

  private deleteCookie(): void {
    document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Strict`;
  }
}
