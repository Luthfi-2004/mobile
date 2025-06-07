import { Component, OnInit } from '@angular/core'; // Tambahkan OnInit di sini
import { AlertController, NavController, Platform } from '@ionic/angular'; // Tambahkan Platform
import { ThemeService } from '../services/theme.service'; // Impor ThemeService

@Component({
  selector: 'app-akun',
  templateUrl: './akun.page.html',
  styleUrls: ['./akun.page.scss'],
  standalone: false,
})
export class AkunPage implements OnInit { // Implementasikan OnInit
  currentUser: any = null;
  profileImage: string = 'assets/img/default-profile.jpg'; // default image
  isDarkTheme: boolean = false; // Properti untuk status tema

  constructor(
    private alertController: AlertController,
    private navCtrl: NavController,
    private themeService: ThemeService, // Inject ThemeService
    private platform: Platform // Inject Platform
  ) {}

  // Lifecycle hook yang dijalankan saat komponen diinisialisasi
  ngOnInit() {
    // Muat status tema saat ini dari ThemeService
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Dengarkan perubahan preferensi tema sistem operasi secara real-time
    // Ini memastikan aplikasi merespons jika pengguna mengubah tema sistem saat aplikasi berjalan
    this.platform.ready().then(() => {
      window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', e => {
              // Set tema di service dan update status isDarkTheme
              this.themeService.setTheme(e.matches ? 'dark' : 'light');
              this.isDarkTheme = e.matches;
            });
    });
  }

  // Lifecycle hook, dijalankan tiap halaman muncul
  ionViewWillEnter() {
    this.loadUserData();
  }

  loadUserData() {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      this.currentUser = userData;
      this.profileImage = userData.profileImage || 'assets/img/default-profile.jpg';
    } else {
      this.currentUser = null;
      this.profileImage = 'assets/img/default-profile.jpg';
    }
  }

  // Metode untuk mengubah tema (terhubung ke ion-toggle di HTML)
  toggleTheme(event: any) {
    this.isDarkTheme = event.detail.checked; // Ambil nilai checked dari toggle
    if (this.isDarkTheme) {
      this.themeService.setTheme('dark'); // Aktifkan tema gelap
    } else {
      this.themeService.setTheme('light'); // Aktifkan tema terang
    }
  }

  // Navigasi halaman
  goToInfoAkun() {
    this.navCtrl.navigateForward('/info-akun');
  }

  goToBantuan() {
    this.navCtrl.navigateForward('/bantuan');
  }

  goToTentangKami() {
    this.navCtrl.navigateForward('/tentang-kami');
  }

  // Konfirmasi logout
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

  // Logout: hapus data login dan kembali ke halaman login
  private performLogout() {
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
    this.navCtrl.navigateRoot('/login');
  }
}
