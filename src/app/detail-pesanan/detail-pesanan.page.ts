import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-detail-pesanan',
  templateUrl: './detail-pesanan.page.html',
  styleUrls: ['./detail-pesanan.page.scss'],
  standalone: false
})
export class DetailPesananPage {
  pesanan: any;

  constructor(private router: Router, private alertController: AlertController) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['pesanan']) {
      this.pesanan = nav.extras.state['pesanan'];

      // Simpan ke localStorage agar bisa dibuka ulang nanti
      localStorage.setItem(`pesanan_${this.pesanan.id}`, JSON.stringify(this.pesanan));
    } else {
      // Coba ambil dari localStorage jika akses langsung
      const id = history.state?.id;
      const stored = id ? localStorage.getItem(`pesanan_${id}`) : null;

      if (stored) {
        this.pesanan = JSON.parse(stored);
      } else {
        // Jika tetap tidak ditemukan, kembali ke halaman riwayat
        this.router.navigate(['/tabs/riwayat']);
      }
    }
  }

async cancelOrder() {
  const alert = await this.alertController.create({
    header: 'Konfirmasi Pembatalan',
    message: 'Apakah Anda yakin ingin membatalkan pesanan ini?',
    buttons: [
      {
        text: 'Batal',
        role: 'cancel',
        cssClass: 'secondary',
      },
      {
        text: 'Ya, Batalkan',
        handler: () => {
          this.pesanan.status = 'Pesanan Dibatalkan';

          // Simpan ulang data pesanan individual
          localStorage.setItem(`pesanan_${this.pesanan.id}`, JSON.stringify(this.pesanan));

          // Perbarui juga di array riwayat
          const riwayat = JSON.parse(localStorage.getItem('riwayat') || '[]');
          const index = riwayat.findIndex((r: any) => r.id === this.pesanan.id);
          if (index > -1) {
            riwayat[index].status = 'Pesanan Dibatalkan';
            localStorage.setItem('riwayat', JSON.stringify(riwayat));
          }

          // Navigasi balik ke halaman riwayat
          this.router.navigate(['/tabs/riwayat']);
        }
      }
    ]
  });

  await alert.present();
}
  // Method untuk logika tampil/tidaknya tombol batal
  isBisaDibatalkan(): boolean {
    const status = this.pesanan?.status?.toLowerCase().trim();
    return status === 'belum lunas';
    
  }
}
