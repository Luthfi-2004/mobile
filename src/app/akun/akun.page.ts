import { Component } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-akun',
  templateUrl: './akun.page.html',
  styleUrls: ['./akun.page.scss'],
  standalone: false,
})
export class AkunPage {
  currentUser: any = null;
  profileImage: string = 'assets/img/default-profile.jpg'; // default image

  constructor(
    private alertController: AlertController,
    private navCtrl: NavController
  ) {}

  // Lifecycle hook, dijalankan tiap halaman muncul
  ionViewWillEnter() {
    this.loadUserData();
  }
  ionViewDidEnter() {
  this.loadUserData();
}
  loadUserData() {
    const userData = localStorage.getItem('userData');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    } else {
      this.currentUser = null;
    }

    const savedImage = localStorage.getItem('profileImage');
    if (savedImage) {
      this.profileImage = savedImage;
    } else {
      this.profileImage = 'assets/img/default-profile.jpg';
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
