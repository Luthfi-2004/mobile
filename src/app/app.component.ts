import { Component, OnInit } from '@angular/core'; // Tambahkan OnInit
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ThemeService } from './services/theme.service'; // Impor ThemeService

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit { // Implementasikan OnInit
  constructor(
    private platform: Platform,
    private router: Router,
    private authService: AuthService,
    private themeService: ThemeService // Inject ThemeService
  ) {
    this.initializeApp();
  }

  // Metode lifecycle hook yang akan dijalankan setelah konstruktor
  ngOnInit() {
    // Muat tema yang tersimpan atau tema sistem saat aplikasi dimulai
    this.themeService.loadTheme();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Cek status login saat app pertama kali dijalankan
      this.checkLoginStatus();
    });
  }

  private checkLoginStatus() {
    // Tunggu sebentar untuk memastikan auth service terinisialisasi
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
