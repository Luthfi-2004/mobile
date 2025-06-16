import { Component, OnInit } from '@angular/core';
import { AlertController, NavController, Platform } from '@ionic/angular';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../auth.service'; // Tambahkan import ini

@Component({
  selector: 'app-akun',
  templateUrl: './akun.page.html',
  styleUrls: ['./akun.page.scss'],
  standalone: false,
})
export class AkunPage implements OnInit {
  currentUser: any = null;
  profileImage: string = 'assets/img/default-profile.jpg';
  isDarkTheme: boolean = false;

  constructor(
    private alertController: AlertController,
    private navCtrl: NavController,
    private themeService: ThemeService,
    private platform: Platform,
    private authService: AuthService // Tambahkan injection ini
  ) {}

  ngOnInit() {
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    this.platform.ready().then(() => {
      window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', e => {
              this.themeService.setTheme(e.matches ? 'dark' : 'light');
              this.isDarkTheme = e.matches;
            });
    });
  }

  ionViewWillEnter() {
    this.loadUserData();
  }

  loadUserData() {
    // Gunakan AuthService untuk mendapatkan data user
    const user = this.authService.getCurrentUser();
    if (user) {
      // Sesuaikan struktur data dengan template HTML
      this.currentUser = {
        ...user,
        username: user.nama // Template menggunakan username, tapi AuthService menyimpan nama
      };
      
      // Load profile image dari localStorage atau gunakan default
      const storedProfileImage = localStorage.getItem('profileImage');
      if (storedProfileImage) {
        this.profileImage = storedProfileImage;
      } else {
        this.profileImage = 'assets/img/default-profile.jpg';
      }
    } else {
      this.currentUser = null;
      this.profileImage = 'assets/img/default-profile.jpg';
    }
  }

  toggleTheme(event: any) {
    this.isDarkTheme = event.detail.checked;
    if (this.isDarkTheme) {
      this.themeService.setTheme('dark');
    } else {
      this.themeService.setTheme('light');
    }
  }

  goToInfoAkun() {
    this.navCtrl.navigateForward('/info-akun');
  }

  goToBantuan() {
    this.navCtrl.navigateForward('/bantuan');
  }

  goToTentangKami() {
    this.navCtrl.navigateForward('/tentang-kami');
  }

  async confirmLogout() {
    const alert = await this.alertController.create({
      header: 'Konfirmasi Logout',
      message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Logout dibatalkan');
          }
        },
        {
          text: 'Keluar',
          cssClass: 'danger',
          handler: () => {
            this.performLogout();
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  // Perbaiki performLogout untuk menggunakan AuthService
  private performLogout() {
    if (this.authService.isLoggedIn()) {
      // Logout melalui API dan hapus semua data auth
      this.authService.logout().subscribe({
        next: () => {
          console.log('Logout berhasil');
          this.navCtrl.navigateRoot('/login');
        },
        error: (error) => {
          console.log('Logout error:', error);
          // Tetap hapus data lokal meskipun API error
          this.authService.forceLogout();
        }
      });
    } else {
      // Jika tidak ada token, langsung redirect ke login
      this.navCtrl.navigateRoot('/login');
    }
  }
}