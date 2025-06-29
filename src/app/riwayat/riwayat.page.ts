// src/app/pages/riwayat/riwayat.page.ts

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
    const ratingChecks = reservations.map(reservasi => {
      if (reservasi.status === 'selesai') {
        return this.ratingService.checkExistingRating(reservasi.id);
      }
      return null;
    });

    const ratingResults = await Promise.all(
      ratingChecks.map(check => {
        if (check) {
          return check.toPromise().catch(() => ({ has_rating: false, rating: null, can_rate: false }));
        }
        return Promise.resolve({ has_rating: false, rating: null, can_rate: false });
      })
    );

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
      items: [],
      has_rating: ratingResults[index]?.has_rating || false,
      rating_data: ratingResults[index]?.rating || null,
      can_rate: ratingResults[index]?.can_rate || false,
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
    this.router.navigate(['/detail-pesanan'], {
      state: {
        pesanan: data,
        reservasi_id: data.id
      }
    });
  }

  beriUlasan(data: any) {
    if (data.status !== 'Dibayar Sebagian') {
      this.presentAlert('Info', 'Anda hanya bisa memberi penilaian pada reservasi yang sudah selesai');
      return;
    }
    if (data.has_rating) {
      this.presentAlert('Info', 'Anda sudah memberikan penilaian untuk reservasi ini');
      return;
    }
    this.router.navigate(['/ulasan'], {
      state: {
        pesanan: data,
        reservasi_id: data.id
      }
    });
  }

  lihatRating(data: any) {
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
    this.router.navigate(['/invoice-detail', data.id]);
  }

  async hapusRiwayat() {
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: 'Yakin ingin menghapus semua riwayat reservasi? Tindakan ini tidak dapat diurungkan.',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus Permanen',
          cssClass: 'ion-color-danger',
          handler: async () => {
            this.prosesHapusRiwayat();
          }
        }
      ]
    });
    await alert.present();
  }

  async prosesHapusRiwayat() {
    const loading = await this.loadingController.create({
      message: 'Menghapus riwayat...'
    });
    await loading.present();

    this.reservationService.clearHistory().subscribe({
      next: (response) => {
        loading.dismiss();
        this.riwayat = [];
        localStorage.removeItem('riwayat');
        this.presentAlert('Sukses', response.message || 'Riwayat berhasil dihapus.');
      },
      error: (error) => {
        loading.dismiss();
        console.error('Error deleting history:', error);
        this.presentAlert('Error', 'Gagal menghapus riwayat di server. Silakan coba lagi.');
      }
    });
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async doRefresh(event: any) {
    await this.loadRiwayat();
    event.target.complete();
  }
}
