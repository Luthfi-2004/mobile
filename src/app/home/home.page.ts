import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { AuthService } from '../auth.service';

declare var navigator: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  images = [
    { src: 'assets/img/indoor.jpg', type: 'indoor', text: 'Area Indoor' },
    { src: 'assets/img/outdoor.jpg', type: 'outdoor', text: 'Area Outdoor' },
    { src: 'assets/img/vvip.jpg', type: 'vvip', text: 'Area VVIP' }
  ];
  currentImageIndex = 0;

  unreadNotificationCount = 0;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private authService: AuthService,
    private platform: Platform
  ) {
    this.startImageSlider();

    // Tangani tombol back Android untuk keluar aplikasi
    this.platform.backButton.subscribeWithPriority(10, async () => {
      const alert = await this.alertController.create({
        header: 'Konfirmasi',
        message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
        buttons: [
          { text: 'Batal', role: 'cancel' },
          {
            text: 'Keluar',
            handler: () => {
              if (this.platform.is('android')) {
                navigator.app.exitApp();
              }
            }
          }
        ]
      });
      await alert.present();
    });
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    }

    this.loadUnreadNotifications();
  }

  loadUnreadNotifications() {
    const notifikasi = JSON.parse(localStorage.getItem('notifikasi') || '[]');
    this.unreadNotificationCount = notifikasi.filter((n: any) => !n.read).length;
  }

  markNotificationsAsRead() {
    const notifikasi = JSON.parse(localStorage.getItem('notifikasi') || '[]');
    const updated = notifikasi.map((n: any) => ({ ...n, read: true }));
    localStorage.setItem('notifikasi', JSON.stringify(updated));
    this.unreadNotificationCount = 0;
  }

  startImageSlider() {
    setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }, 4000);
  }

  goToReservasi() {
    this.router.navigate(['/reservasi']);
  }

  async handleInvoiceClick() {
    const riwayat = JSON.parse(localStorage.getItem('riwayat') || '[]');
    if (riwayat.length === 0) {
      const alert = await this.alertController.create({
        header: 'Belum Ada Invoice',
        message: 'Anda belum melakukan pemesanan atau transaksi apapun.',
        buttons: ['OK']
      });
      await alert.present();
    } else {
      const transaksiTerakhir = riwayat[riwayat.length - 1];
      this.router.navigate(['/invoice'], { state: { transaksi: transaksiTerakhir } });
    }
  }
}
