import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private router: Router,
    private authService: AuthService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Cek status login saat app pertama kali dijalankan
      this.checkLoginStatus();
    });
  }

  private checkLoginStatus() {
    // Wait a bit to ensure auth service is initialized
    setTimeout(() => {
      const isLoggedIn = this.authService.isLoggedIn();
      const currentUrl = this.router.url;
      
      if (isLoggedIn) {
        // Jika sudah login dan masih di halaman login/splash, redirect ke home
        if (currentUrl === '/login' || currentUrl === '/splash' || currentUrl === '/') {
          this.router.navigate(['/tabs/home']);
        }
      } else {
        // Jika belum login dan bukan di halaman publik, redirect ke splash
        const publicRoutes = ['/login', '/registrasi', '/splash'];
        if (!publicRoutes.includes(currentUrl)) {
          this.router.navigate(['/splash']);
        }
      }
    }, 100);
  }
}