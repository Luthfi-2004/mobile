import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-riwayat',
  templateUrl: './riwayat.page.html',
  styleUrls: ['./riwayat.page.scss'],
  standalone: false
})
export class RiwayatPage {
  riwayat: any[] = [];

  constructor(
    private router: Router,
    private alertController: AlertController
  ) {}

  ionViewWillEnter() {
    this.riwayat = JSON.parse(localStorage.getItem('riwayat') || '[]').reverse();
  }

  lihatDetail(data: any) {
    this.router.navigate(['/detail-pesanan'], {
      state: { pesanan: data }
    });
  }

  beriUlasan(data: any) {
    this.router.navigate(['/ulasan'], {
      state: { pesanan: data }
    });
  }

  async hapusRiwayat() {
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: 'Yakin ingin menghapus semua riwayat transaksi?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: () => {
            localStorage.removeItem('riwayat');
            this.riwayat = []; // kosongkan array setelah hapus
            console.log('Riwayat transaksi telah dihapus.');
          }
        }
      ]
    });

    await alert.present();
  }
}
