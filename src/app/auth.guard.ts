import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Check if user is logged in locally
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, redirecting to login');
      return this.redirectToLogin(state.url);
    }

    // Verify token with backend
    return this.authService.verifyToken().pipe(
      map(() => {
        console.log('Token verified, access granted');
        return true;
      }),
      catchError((error) => {
        console.log('Token verification failed:', error);
        
        if (error.status === 401 || error.status === 403) {
          // Token is invalid or expired
          this.authService.forceLogout('Sesi Anda telah berakhir. Silakan login kembali.');
        }
        
        return [this.redirectToLogin(state.url)];
      })
    );
  }

  private redirectToLogin(returnUrl: string): UrlTree {
    return this.router.createUrlTree(['/login'], { 
      queryParams: { returnUrl } 
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    
    if (this.authService.isLoggedIn()) {
      // User is already logged in, redirect to home
      console.log('User already logged in, redirecting to home');
      return this.router.createUrlTree(['/tabs/home']);
    }
    
    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      return this.router.createUrlTree(['/login']);
    }
    
    if (user.peran !== 'admin') {
      console.log('User is not admin, access denied');
      return this.router.createUrlTree(['/tabs/home']);
    }
    
    return true;
  }
}