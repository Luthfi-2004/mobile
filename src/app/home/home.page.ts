import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../auth.service'; // Import AuthService

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  images: { src: string; type: 'indoor' | 'outdoor' | 'vvip'; text?: string }[] = [
    { 
      src: 'assets/img/indoor.jpg', 
      type: 'indoor',
      text: 'Area Indoor' 
    },
    { 
      src: 'assets/img/outdoor.jpg', 
      type: 'outdoor',
      text: 'Area Outdoor' 
    },
    { 
      src: 'assets/img/vvip.jpg', 
      type: 'vvip',
      text: 'Area VVIP' 
    }
  ];
  currentImageIndex = 0;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private authService: AuthService // Tambahkan AuthService
  ) {
    this.startImageSlider();
  }

  ngOnInit() {
    // Jika user belum login, arahkan ke halaman login
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    }
  }

  startImageSlider() {
    setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }, 4000);
  }

  goToReservasi() {
    this.router.navigate(['/reservasi']);
  }

  // Fungsi untuk menangani klik invoice tab
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