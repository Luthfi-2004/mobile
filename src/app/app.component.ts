import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private router: Router
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
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (isLoggedIn === 'true') {
      // Jika sudah login, pastikan di halaman home
      if (this.router.url === '/login') {
        this.router.navigate(['/home']);
      }
    } else {
      // Jika belum login, arahkan ke halaman login
      if (this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
    }
  }
}