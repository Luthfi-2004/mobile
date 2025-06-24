import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ReservationService } from '../services/reservation.service';
import { RatingService } from '../services/rating.service';
import { forkJoin } from 'rxjs';

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
    private reservationService: ReservationService,
    private ratingService: RatingService
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
        if (response.reservations && response.reservations.data) {
          const reservations = response.reservations.data;
          
          // Load rating status untuk setiap reservasi
          this.loadRatingStatus(reservations).then(() => {
            loading.dismiss();
          });
        } else {
          loading.dismiss();
        }
      },
      error: (error) => {
        loading.dismiss();
        console.error('Error loading riwayat:', error);
        this.presentAlert('Error', 'Gagal memuat riwayat reservasi');
      }
    });
  }

  private async loadRatingStatus(reservations: any[]) {
    // Transform data dan load rating status
    const ratingChecks = reservations.map(reservasi => {
      if (reservasi.status === 'selesai') {
        return this.ratingService.checkExistingRating(reservasi.id);
      }
      return null;
    });

    // Execute all rating checks
    const ratingResults = await Promise.all(
      ratingChecks.map(check => {
        if (check) {
          // If the promise fails, return an object with the same structure
          return check.toPromise().catch(() => ({ has_rating: false, rating: null, can_rate: false }));
        }
        return Promise.resolve({ has_rating: false, rating: null, can_rate: false });
      })
    );

    // Transform data dengan rating status
    this.riwayat = reservations.map((reservasi: any, index: number) => ({
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
      items: [], // Items will be loaded from orders if needed
      has_rating: ratingResults[index]?.has_rating || false,
      rating_data: ratingResults[index]?.rating || null,
      can_rate: ratingResults[index]?.can_rate || false,
      // Raw data for other purposes
      raw_data: reservasi
    }));
  }

  private getStatusLabel(status: string, paymentStatus?: string): string {
    switch (status) {
      case 'selesai':
        return 'Selesai';
      case 'dibatalkan':
        return 'Pesanan Dibatalkan';
      case 'pending_payment':
        return 'Dibayar Sebagian';
      case 'paid':
        return paymentStatus === 'paid' ? 'Dikonfirmasi' : 'Belum Lunas';
      case 'active_order':
        return 'Sedang Berlangsung';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  lihatDetail(data: any) {
    // Navigate to detail with reservation data
    this.router.navigate(['/detail-pesanan'], {
      state: { 
        pesanan: data,
        reservasi_id: data.id 
      }
    });
  }

  beriUlasan(data: any) {
    // Ensure the reservation can be rated
    if (data.status !== 'Dibayar Sebagian') {
      this.presentAlert('Info', 'Anda hanya bisa memberi penilaian pada reservasi yang sudah selesai');
      return;
    }

    if (data.has_rating) {
      this.presentAlert('Info', 'Anda sudah memberikan penilaian untuk reservasi ini');
      return;
    }

    // Navigate to the review page with reservation data
    this.router.navigate(['/ulasan'], {
      state: { 
        pesanan: data,
        reservasi_id: data.id
      }
    });
  }

  lihatRating(data: any) {
    // Navigate to the review page in view-only mode
    this.router.navigate(['/ulasan'], {
      state: { 
        pesanan: data,
        reservasi_id: data.id,
        view_only: true,
        rating_data: data.rating_data
      }
    });
  }

  lanjutkanPembayaran(data: any) {
    // Navigate to invoice detail or payment page
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
            // Implement delete history on the server (if there's an endpoint)
            // For now, just clear local data
            this.riwayat = [];
            
            // Also remove localStorage backup if it exists
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

  // Helper method to refresh data
  async doRefresh(event: any) {
    await this.loadRiwayat();
    event.target.complete();
  }
}