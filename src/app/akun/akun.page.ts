import { Component, OnInit } from '@angular/core';
import { AlertController, NavController, Platform } from '@ionic/angular';
import { ThemeService } from '../services/theme.service';
import { AuthService, User } from '../auth.service';
import { ProfileImageService } from '../services/profile-image.service'; // ✅ Import service gambar

@Component({
  selector: 'app-akun',
  templateUrl: './akun.page.html',
  styleUrls: ['./akun.page.scss'],
  standalone: false
})
export class AkunPage implements OnInit {
  currentUser: User | null = null;
  profileImage: string = 'assets/img/default-profile.jpg';
  isDarkTheme: boolean = false;

  constructor(
    private alertController: AlertController,
    private navCtrl: NavController,
    private themeService: ThemeService,
    private platform: Platform,
    private authService: AuthService,
    private profileImageService: ProfileImageService // ✅ Injeksi service
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

    // ✅ Subscribe ke perubahan gambar profil
    this.profileImageService.currentProfileImage$.subscribe(image => {
      this.profileImage = image || 'assets/img/default-profile.jpg';
    });
  }

  ionViewWillEnter() {
    this.loadUserData();
  }

  loadUserData() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser = {
        ...user,
        username: user.nama
      } as User;

      // ✅ Load gambar profil user
      this.profileImageService.loadCurrentUserProfileImage(user.id);
    } else {
      this.currentUser = null;
      this.profileImageService.resetCurrentProfileImage();
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

  // ✅ Logout dengan reset profile image
  private performLogout() {
    if (this.authService.isLoggedIn()) {
      this.authService.logout().subscribe({
        next: () => {
          console.log('Logout berhasil');
          this.profileImageService.resetCurrentProfileImage();
          this.navCtrl.navigateRoot('/login');
        },
        error: (error) => {
          console.log('Logout error:', error);
          this.profileImageService.resetCurrentProfileImage();
          this.authService.forceLogout();
        }
      });
    } else {
      this.profileImageService.resetCurrentProfileImage();
      this.authService.forceLogout();
    }
  }
}
