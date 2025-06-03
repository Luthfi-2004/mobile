import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface User {
  id: number;
  nama: string;
  email: string;
  nomor_hp?: string;
  peran: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api'; // Sesuaikan dengan URL Laravel Anda
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
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user_data');
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (token && user && isLoggedIn === 'true') {
      try {
        this.tokenSubject.next(token);
        this.currentUserSubject.next(JSON.parse(user));
        this.isAuthenticated = true;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearAuthData();
      }
    }
  }

  // Register new user
  register(data: RegisterData): Observable<AuthResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    return this.http.post<AuthResponse>(`${this.apiUrl}/customer/register`, data, { headers })
      .pipe(
        tap((response) => {
          // Hanya simpan jika response berhasil
          if (response && response.token && response.user) {
            this.storeAuthData(response.token, response.user);
          }
        }),
        catchError((error) => {
          console.error('Register error:', error);
          // Jangan simpan data jika ada error
          return throwError(() => error);
        })
      );
  }

  // Login user
  login(data: LoginData): Observable<AuthResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    return this.http.post<AuthResponse>(`${this.apiUrl}/customer/login`, data, { headers })
      .pipe(
        tap((response) => {
          // Hanya simpan jika response berhasil
          if (response && response.token && response.user) {
            this.storeAuthData(response.token, response.user);
          }
        }),
        catchError((error) => {
          console.error('Login error:', error);
          // Jangan simpan data jika ada error
          return throwError(() => error);
        })
      );
  }

  // Logout user
  logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.post(`${this.apiUrl}/customer/logout`, {}, { headers })
      .pipe(
        tap(() => {
          this.clearAuthData();
          this.router.navigate(['/login']);
        }),
        catchError((error) => {
          // Even if API call fails, clear local data
          console.error('Logout error:', error);
          this.clearAuthData();
          this.router.navigate(['/login']);
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
    } catch (error) {
      console.error('Error storing auth data:', error);
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
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
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
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest'
    });
  }

  // Make authenticated HTTP request
  authenticatedRequest(method: string, endpoint: string, data?: any): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.apiUrl}${endpoint}`;

    switch (method.toLowerCase()) {
      case 'get':
        return this.http.get(url, { headers });
      case 'post':
        return this.http.post(url, data, { headers });
      case 'put':
        return this.http.put(url, data, { headers });
      case 'delete':
        return this.http.delete(url, { headers });
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  // Verify token validity with backend
  verifyToken(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/customer/profile`, { headers })
      .pipe(
        catchError((error) => {
          if (error.status === 401 || error.status === 403) {
            this.clearAuthData();
            this.router.navigate(['/login']);
          }
          return throwError(() => error);
        })
      );
  }
}