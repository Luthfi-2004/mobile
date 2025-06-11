import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    // 1. Cek token di localStorage
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, redirecting to login');
      return this.redirectToLogin(state.url);
    }

    // 2. Verifikasi token ke backend
    return this.authService.verifyToken().pipe(
      map(() => {
        console.log('Token verified, access granted');
        return true;
      }),
      catchError((error) => {
        console.log('Token verification failed:', error);
        if (error.status === 401 || error.status === 403) {
          // Token invalid/expired → logout paksa & redirect
          this.authService.forceLogout(
            'Sesi Anda telah berakhir. Silakan login kembali.'
          );
        }
        // Kembalikan UrlTree untuk redirect ke login
        return of(this.redirectToLogin(state.url));
      })
    );
  }

  private redirectToLogin(returnUrl: string): UrlTree {
    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl }
    });
  }
}

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (this.authService.isLoggedIn()) {
      console.log('User already logged in, redirecting to home');
      return this.router.createUrlTree(['/tabs/home']);
    }
    return true;
  }
}

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.log('No user data, redirecting to login');
      return this.router.createUrlTree(['/login']);
    }
    if (user.peran !== 'admin') {
      console.log('User is not admin, access denied');
      return this.router.createUrlTree(['/tabs/home']);
    }
    return true;
  }
}
