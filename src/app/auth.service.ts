import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root' // Ini membuat service tersedia di seluruh aplikasi
})
export class AuthService {
  private isAuthenticated = false;

  constructor(private router: Router) {
    // Cek status login saat service diinisialisasi
    this.isAuthenticated = !!localStorage.getItem('isLoggedIn');
  }

  // Method untuk login
  login() {
    this.isAuthenticated = true;
    localStorage.setItem('isLoggedIn', 'true');
    this.router.navigate(['/home']);
  }

  // Method untuk logout
  logout() {
    this.isAuthenticated = false;
    localStorage.removeItem('isLoggedIn');
    this.router.navigate(['/login']);
  }

  // Method untuk mengecek status login
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }
}