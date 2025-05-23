import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
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
    private alertController: AlertController
  ) {
    this.startImageSlider();
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
      // Jika belum ada transaksi, beri pemberitahuan
      const alert = await this.alertController.create({
        header: 'Belum Ada Invoice',
        message: 'Anda belum melakukan pemesanan atau transaksi apapun.',
        buttons: ['OK']
      });
      await alert.present();
    } else {
      // Jika ada transaksi, arahkan ke halaman invoice
      const transaksiTerakhir = riwayat[riwayat.length - 1];
      this.router.navigate(['/invoice'], { state: { transaksi: transaksiTerakhir } });
    }
  }
}
