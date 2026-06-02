import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { TokenService } from '../services/token.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) {
    return true;
  }

  const tokenService = inject(TokenService);
  const router = inject(Router);
  const user = tokenService.currentUser();

  if (user && user.role === 'ADMIN') {
    return true;
  }

  router.navigate(['/']);
  return false;
};
