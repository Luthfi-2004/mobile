import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, from } from 'rxjs';
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

export interface ApiErrorResponse {
  message: string;
  errors?: { [key: string]: string[] };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private isAuthenticated = false;

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredAuth();
  }

  // Load stored authentication data saat app start
  private loadStoredAuth() {
    try {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user_data');
      const isLoggedIn = localStorage.getItem('isLoggedIn');

      if (token && user && isLoggedIn === 'true') {
        const parsedUser = JSON.parse(user);
        this.tokenSubject.next(token);
        this.currentUserSubject.next(parsedUser);
        this.isAuthenticated = true;
        
        // Verify token validity in background
        this.verifyTokenSilently();
      } else {
        this.clearAuthData();
      }
    } catch (error) {
      console.error('Error loading stored auth data:', error);
      this.clearAuthData();
    }
  }

  // Get CSRF token first for Laravel Sanctum
  private getCsrfToken(): Observable<any> {
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });
    
    return this.http.get(`${this.apiUrl.replace('/api', '')}/sanctum/csrf-cookie`, { 
      headers,
      withCredentials: true 
    });
  }

  // Register new user
  register(data: RegisterData): Observable<AuthResponse> {
    // First get CSRF token, then register
    return this.getCsrfToken().pipe(
      switchMap(() => {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        });

        return this.http.post<AuthResponse>(`${this.apiUrl}/customer/register`, data, { 
          headers,
          withCredentials: true 
        });
      }),
      tap((response) => {
        if (response && response.token && response.user) {
          this.storeAuthData(response.token, response.user);
        }
      }),
      catchError((error) => this.handleAuthError(error, 'Register'))
    );
  }

  // Login user
  login(data: LoginData): Observable<AuthResponse> {
    // First get CSRF token, then login
    return this.getCsrfToken().pipe(
      switchMap(() => {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        });

        return this.http.post<AuthResponse>(`${this.apiUrl}/customer/login`, data, { 
          headers,
          withCredentials: true 
        });
      }),
      tap((response) => {
        if (response && response.token && response.user) {
          this.storeAuthData(response.token, response.user);
        }
      }),
      catchError((error) => this.handleAuthError(error, 'Login'))
    );
  }

  // Logout user
  logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.post(`${this.apiUrl}/customer/logout`, {}, { 
      headers,
      withCredentials: true 
    }).pipe(
      tap(() => {
        this.clearAuthData();
      }),
      catchError((error) => {
        // Even if API call fails, clear local data
        console.error('Logout error:', error);
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  // Store authentication data
  private storeAuthData(token: string, user: User) {
    try {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      localStorage.setItem('isLoggedIn', 'true');
      
      this.tokenSubject.next(token);
      this.currentUserSubject.next(user);
      this.isAuthenticated = true;
      
      console.log('Auth data stored successfully');
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  }

  // Clear authentication data
  private clearAuthData() {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('isLoggedIn');
      
      this.tokenSubject.next(null);
      this.currentUserSubject.next(null);
      this.isAuthenticated = false;
      
      console.log('Auth data cleared');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Handle authentication errors
  private handleAuthError(error: HttpErrorResponse, operation: string): Observable<never> {
    console.error(`${operation} error:`, error);
    
    let errorMessage = `Terjadi kesalahan saat ${operation.toLowerCase()}.`;
    
    if (error.status === 0) {
      errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    } else if (error.status === 422 && error.error?.errors) {
      const errors = error.error.errors;
      const errorMessages: string[] = [];
      
      Object.keys(errors).forEach(field => {
        if (Array.isArray(errors[field])) {
          errorMessages.push(...errors[field]);
        }
      });
      
      if (errorMessages.length > 0) {
        errorMessage = errorMessages.join(', ');
      }
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'Email atau password salah.';
    } else if (error.status === 500) {
      errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
    }

    return throwError(() => ({
      ...error,
      userMessage: errorMessage
    }));
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.tokenSubject.value;
  }

  // Check if user is authenticated
  isLoggedIn(): boolean {
    return this.isAuthenticated && !!this.getCurrentToken();
  }

  // Get headers with authorization token
  getAuthHeaders(): HttpHeaders {
    const token = this.getCurrentToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // Make authenticated HTTP request
  authenticatedRequest(method: string, endpoint: string, data?: any): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.apiUrl}${endpoint}`;

    const options = { 
      headers, 
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
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  // Verify token validity with backend (silent)
  private verifyTokenSilently(): void {
    if (!this.getCurrentToken()) return;

    const headers = this.getAuthHeaders();
    this.http.get(`${this.apiUrl}/customer/profile`, { 
      headers,
      withCredentials: true 
    }).subscribe({
      next: (response: any) => {
        // Token is valid, update user data if needed
        if (response.user) {
          this.currentUserSubject.next(response.user);
          localStorage.setItem('user_data', JSON.stringify(response.user));
        }
      },
      error: (error) => {
        if (error.status === 401 || error.status === 403) {
          console.log('Token expired or invalid, clearing auth data');
          this.clearAuthData();
        }
      }
    });
  }

  // Verify token validity with backend (with error handling)
  verifyToken(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/customer/profile`, { 
      headers,
      withCredentials: true 
    }).pipe(
      tap((response: any) => {
        if (response.user) {
          this.currentUserSubject.next(response.user);
          localStorage.setItem('user_data', JSON.stringify(response.user));
        }
      }),
      catchError((error) => {
        if (error.status === 401 || error.status === 403) {
          this.clearAuthData();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
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

  // Update user profile
  updateProfile(userData: Partial<User>): Observable<any> {
    return this.authenticatedRequest('PUT', '/customer/profile', userData).pipe(
      tap((response: any) => {
        if (response.user) {
          this.currentUserSubject.next(response.user);
          localStorage.setItem('user_data', JSON.stringify(response.user));
        }
      })
    );
  }

  // Change password
  changePassword(passwordData: { current_password: string; password: string; password_confirmation: string }): Observable<any> {
    return this.authenticatedRequest('POST', '/customer/change-password', passwordData);
  }
}