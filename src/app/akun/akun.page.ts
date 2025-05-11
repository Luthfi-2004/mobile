import { Component } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-akun',
  templateUrl: './akun.page.html',
  styleUrls: ['./akun.page.scss'],
  standalone: false,
})
export class AkunPage {

  constructor(
    private alertController: AlertController,
    private navCtrl: NavController
  ) {}

  // Fungsi untuk navigasi ke halaman Info Akun
  goToInfoAkun() {
    this.navCtrl.navigateForward('/info-akun');
  }

  // Fungsi untuk navigasi ke halaman Pengaturan
  goToPengaturan() {
    this.navCtrl.navigateForward('/pengaturan');
  }

  // Fungsi untuk navigasi ke halaman Tentang Kami
  goToTentangKami() {
    this.navCtrl.navigateForward('/tentang-kami');
  }

  // Fungsi konfirmasi logout dengan AlertController
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
      backdropDismiss: false // Prevent closing by tapping outside
    });

    await alert.present();
  }

  // Fungsi untuk proses logout
  private performLogout() {
    console.log('Proses logout dilakukan');
    // Tambahkan logika logout sebenarnya di sini, contoh:
    // 1. Clear token/local storage
    // 2. Redirect ke halaman login
    this.navCtrl.navigateRoot('/login');
  }
}