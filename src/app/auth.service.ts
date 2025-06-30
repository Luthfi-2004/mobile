// src/app/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';

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

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verifikasi token dan muat data user terbaru dari server
      this.verifyTokenAndLoadUser(token);
    }
  }

  // Verifikasi token dan muat data user terbaru dari server
  private verifyTokenAndLoadUser(token: string): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    this.http.get<any>(`${this.apiUrl}/customer/profile`, { headers }).subscribe({
      next: (res) => {
        if (res.user) {
          this.storeAuthData(token, res.user); // Simpan token dan data user yang VALID
        } else {
          this.clearAuthData(); // Jika response aneh, hapus sesi
        }
      },
      error: () => {
        this.clearAuthData(); // Jika token tidak valid (error 401 dll), hapus sesi
      }
    });
  }

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

  private getCsrfToken(): Observable<any> {
    return this.http.get(
      `${this.apiUrl.replace('/api', '')}/sanctum/csrf-cookie`,
      { withCredentials: true }
    );
  }

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

  logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/customer/logout`, {}, { headers, withCredentials: true }).pipe(
      tap(() => this.clearAuthData()),
      catchError(() => {
        this.clearAuthData();
        return of(null); // Selalu berhasil di sisi frontend
      })
    );
  }

  private storeAuthData(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    this.tokenSubject.next(token);
    this.currentUserSubject.next(user);
    console.log('Auth data stored');
  }

  private clearAuthData(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']); // Paksa kembali ke login
    console.log('Auth data cleared');
  }

  updateCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Get current user ID (string format atau 'guest' jika tidak login)
  getCurrentUserId(): string {
    const user = this.getCurrentUser();
    return user ? `${user.id}` : 'guest';
  }

  getCurrentToken(): string | null {
    return this.tokenSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentToken();
  }

  public getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json'
    });
    const token = this.getCurrentToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

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
      case 'get': return this.http.get(url, options);
      case 'post': return this.http.post(url, data, options);
      case 'put': return this.http.put(url, data, options);
      case 'patch': return this.http.patch(url, data, options);
      case 'delete': return this.http.delete(url, options);
      default: throw new Error('Unsupported HTTP method');
    }
  }

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

  forceLogout(message?: string): void {
    this.clearAuthData();
    this.router.navigate(['/login'], {
      queryParams: message ? { message } : {}
    });
  }

  changePassword(data: ChangePasswordData): Observable<{ message: string }> {
    return this.authenticatedRequest('post', '/customer/profile/change-password', data)
      .pipe(
        catchError(err => this.handleAuthError(err, 'Change Password'))
      );
  }

  requestPasswordReset(
    emailOrPhone: string
  ): Observable<{ message: string; identifier?: string }> {
    return this.getCsrfToken().pipe(
      switchMap(() =>
        this.http.post<{ message: string; identifier?: string }>(
          `${this.apiUrl}/customer/password/request-reset`,
          { email_or_phone: emailOrPhone },
          { withCredentials: true }
        )
      ),
      catchError(err => this.handleAuthError(err, 'Request Reset Password'))
    );
  }

  resetPassword(
    identifier: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Observable<{ message: string }> {
    return this.getCsrfToken().pipe(
      switchMap(() =>
        this.http.post<{ message: string }>(
          `${this.apiUrl}/customer/password/reset`,
          {
            identifier,
            password: newPassword,
            password_confirmation: newPasswordConfirmation
          },
          { withCredentials: true }
        )
      ),
      catchError(err => this.handleAuthError(err, 'Reset Password'))
    );
  }

  private handleAuthError(
    error: HttpErrorResponse,
    operation: string
  ): Observable<never> {
    console.error(`${operation} error:`, error);
    let msg = `Error during ${operation.toLowerCase()}.`;
    if (error.status === 0) {
      msg = 'Tidak dapat terhubung ke server.';
    } else if (error.status === 422 && error.error.errors) {
      msg = Object.values(error.error.errors).flat().join(', ');
    } else if (error.status === 401) {
      msg = 'Kredensial tidak valid.';
    } else if (error.error?.message) {
      msg = error.error.message;
    } else {
      msg = 'Terjadi kesalahan. Silakan coba lagi.';
    }
    return throwError(() => ({ ...error, userMessage: msg }));
  }
}