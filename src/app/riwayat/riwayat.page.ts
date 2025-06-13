import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ReservationService } from '../services/reservation.service';

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
    private alertController: AlertController,
    private loadingController: LoadingController,
    private reservationService: ReservationService
  ) {}

  // Akan dipanggil setiap kali halaman ini dibuka
  ionViewWillEnter() {
    this.loadRiwayat();
  }

  async loadRiwayat() {
    const loading = await this.loadingController.create({
      message: 'Memuat riwayat...'
    });
    await loading.present();

    this.reservationService.getReservations().subscribe({
      next: (response) => {
        loading.dismiss();
        
        // Transform data dari API ke format yang sesuai dengan template
        if (response.reservations && response.reservations.data) {
          this.riwayat = response.reservations.data.map((reservasi: any) => ({
            id: reservasi.id,
            tanggal: new Date(reservasi.created_at).toLocaleString('id-ID'),
            waktu_kedatangan: reservasi.waktu_kedatangan,
            kode_reservasi: reservasi.kode_reservasi,
            jumlah_tamu: reservasi.jumlah_tamu,
            status: this.getStatusLabel(reservasi.status, reservasi.payment_status),
            total: reservasi.total_bill || 0,
            payment_method: reservasi.payment_method,
            meja: reservasi.meja || [],
            catatan: reservasi.catatan,
            items: [], // Items akan diload dari orders jika diperlukan
            // Data mentah untuk keperluan lain
            raw_data: reservasi
          }));
        }
      },
      error: (error) => {
        loading.dismiss();
        console.error('Error loading riwayat:', error);
        this.presentAlert('Error', 'Gagal memuat riwayat reservasi');
      }
    });
  }

  private getStatusLabel(status: string, paymentStatus?: string): string {
    switch (status) {
      case 'selesai':
        return 'Selesai';
      case 'dibatalkan':
        return 'Pesanan Dibatalkan';
      case 'pending_payment':
        return 'Belum Dibayar';
      case 'confirmed':
        return paymentStatus === 'paid' ? 'Dikonfirmasi' : 'Belum Lunas';
      case 'active_order':
        return 'Sedang Berlangsung';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  lihatDetail(data: any) {
    // Navigasi ke detail dengan membawa data reservasi
    this.router.navigate(['/detail-pesanan'], {
      state: { 
        pesanan: data,
        reservasi_id: data.id 
      }
    });
  }

  beriUlasan(data: any) {
    this.router.navigate(['/ulasan'], {
      state: { pesanan: data }
    });
  }

  lanjutkanPembayaran(data: any) {
    // Navigasi ke invoice detail atau payment page
    this.router.navigate(['/invoice-detail', data.id]);
  }

  async hapusRiwayat() {
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: 'Yakin ingin menghapus semua riwayat transaksi? Data akan dihapus dari server.',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: async () => {
            // Implementasi hapus riwayat di server (jika ada endpoint)
            // Untuk sementara hanya clear data lokal
            this.riwayat = [];
            
            // Juga hapus localStorage backup jika masih ada
            localStorage.removeItem('riwayat');
            
            this.presentAlert('Sukses', 'Riwayat berhasil dihapus');
          }
        }
      ]
    });

    await alert.present();
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({ 
      header, 
      message, 
      buttons: ['OK'] 
    });
    await alert.present();
  }

  // Helper method untuk refresh data
  async doRefresh(event: any) {
    await this.loadRiwayat();
    event.target.complete();
  }
}