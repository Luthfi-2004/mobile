import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';

export interface User {
  id: number;
  nama: string;
  email: string;
  nomor_hp?: string;
  peran: string;
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  token_type?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  nama: string;
  email: string;
  nomor_hp?: string;
  password: string;
  password_confirmation: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredAuth();
  }

  // Load stored auth on startup
  private loadStoredAuth(): void {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('user_data');
    if (token && userJson) {
      const user = JSON.parse(userJson);
      this.tokenSubject.next(token);
      this.currentUserSubject.next(user);
      // background verify
      this.verifyTokenSilently();
    } else {
      this.clearAuthData();
    }
  }

  // CSRF for Sanctum
  private getCsrfToken(): Observable<any> {
    return this.http.get(
      `${this.apiUrl.replace('/api', '')}/sanctum/csrf-cookie`,
      { withCredentials: true }
    );
  }

  // Register new user
  register(data: RegisterData): Observable<AuthResponse> {
    return this.getCsrfToken().pipe(
      switchMap(() =>
        this.http.post<AuthResponse>(
          `${this.apiUrl}/customer/register`,
          data,
          { withCredentials: true }
        )
      ),
      tap(res => this.storeAuthData(res.token, res.user)),
      catchError(err => this.handleAuthError(err, 'Register'))
    );
  }

  // Login user
  login(data: LoginData): Observable<AuthResponse> {
    return this.getCsrfToken().pipe(
      switchMap(() =>
        this.http.post<AuthResponse>(
          `${this.apiUrl}/customer/login`,
          data,
          { withCredentials: true }
        )
      ),
      tap(res => this.storeAuthData(res.token, res.user)),
      catchError(err => this.handleAuthError(err, 'Login'))
    );
  }

  // Logout user
  logout(): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/customer/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => this.clearAuthData()),
        catchError(err => {
          this.clearAuthData();
          return throwError(() => err);
        })
      );
  }

  // Store authentication data
  private storeAuthData(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    this.tokenSubject.next(token);
    this.currentUserSubject.next(user);
    console.log('Auth data stored');
  }

  // Clear authentication data
  private clearAuthData(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    console.log('Auth data cleared');
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.tokenSubject.value;
  }

  // Check if user is authenticated (persistent)
  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // Get headers with authorization token
  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'X-Requested-With': 'XMLHttpRequest' });
    const token = this.getCurrentToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Make authenticated HTTP request
  authenticatedRequest(
    method: string,
    endpoint: string,
    data?: any
  ): Observable<any> {
    const url = `${this.apiUrl}${endpoint}`;
    const options = {
      headers: this.getAuthHeaders(),
      withCredentials: true
    };
    switch (method.toLowerCase()) {
      case 'get':
        return this.http.get(url, options);
      case 'post':
        return this.http.post(url, data, options);
      case 'put':
        return this.http.put(url, data, options);
      case 'patch':
        return this.http.patch(url, data, options);
      case 'delete':
        return this.http.delete(url, options);
      default:
        throw new Error('Unsupported HTTP method');
    }
  }

  // Silent token verify
  private verifyTokenSilently(): void {
    const token = this.getCurrentToken();
    if (!token) return;
    this.http
      .get(`${this.apiUrl}/customer/profile`, {
        headers: this.getAuthHeaders(),
        withCredentials: true
      })
      .subscribe({
        next: (res: any) => {
          if (res.user) {
            this.currentUserSubject.next(res.user);
            localStorage.setItem('user_data', JSON.stringify(res.user));
          }
        },
        error: err => {
          if (err.status === 401 || err.status === 403) {
            this.clearAuthData();
          }
        }
      });
  }

  // Verify token validity with backend
  verifyToken(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/customer/profile`, {
        headers: this.getAuthHeaders(),
        withCredentials: true
      })
      .pipe(
        tap((res: any) => {
          if (res.user) {
            this.currentUserSubject.next(res.user);
            localStorage.setItem('user_data', JSON.stringify(res.user));
          }
        }),
        catchError(err => {
          if (err.status === 401 || err.status === 403) {
            this.clearAuthData();
            this.router.navigate(['/login']);
          }
          return throwError(() => err);
        })
      );
  }

  // Force logout and redirect
  forceLogout(message?: string): void {
    this.clearAuthData();
    this.router.navigate(['/login'], {
      queryParams: message ? { message } : {}
    });
  }

  // Handle authentication errors
  private handleAuthError(
    error: HttpErrorResponse,
    operation: string
  ): Observable<never> {
    console.error(`${operation} error:`, error);
    let msg = `Error during ${operation.toLowerCase()}.`;
    if (error.status === 0) {
      msg = 'Cannot connect to server.';
    } else if (error.status === 422 && error.error.errors) {
      msg = Object.values(error.error.errors).flat().join(', ');
    } else if (error.status === 401) {
      msg = 'Invalid credentials.';
    }
    return throwError(() => ({ ...error, userMessage: msg }));
  }
}
