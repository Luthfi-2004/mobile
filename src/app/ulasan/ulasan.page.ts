import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { RatingService } from '../services/rating.service';

@Component({
  selector: 'app-ulasan',
  templateUrl: './ulasan.page.html',
  styleUrls: ['./ulasan.page.scss'],
  standalone: false
})
export class UlasanPage {
  stars = [1, 2, 3, 4, 5];
  ratingMakanan: number = 0;
  ratingPelayanan: number = 0;
  ratingAplikasi: number = 0;
  pesanan: any;
  reservasiId: number = 0;
  ulasanSudahAda: boolean = false;
  viewOnly: boolean = false;
  feedback: string = '';
  existingRating: any = null;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private ratingService: RatingService
  ) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state;
    
    if (state) {
      this.pesanan = state['pesanan'];
      this.reservasiId = state['reservasi_id'] || 0;
      this.viewOnly = state['view_only'] || false;
      this.existingRating = state['rating_data'] || null;
    }

    if (this.reservasiId && !this.viewOnly) {
      this.checkExistingRating();
    } else if (this.existingRating) {
      this.loadExistingRatingData();
    }
  }

  async checkExistingRating() {
    const loading = await this.loadingController.create({
      message: 'Memuat data penilaian...'
    });
    await loading.present();

    this.ratingService.checkExistingRating(this.reservasiId).subscribe({
      next: (response) => {
        loading.dismiss();
        if (response.has_rating) {
          this.ulasanSudahAda = true;
          this.existingRating = response.rating;
          this.loadExistingRatingData();
        } else {
          // Load temporary rating dari localStorage jika ada
          this.loadTemporaryRating();
        }
      },
      error: (error) => {
        loading.dismiss();
        console.error('Error checking existing rating:', error);
        this.presentAlert('Error', 'Gagal memuat data penilaian');
      }
    });
  }

  loadExistingRatingData() {
    if (this.existingRating) {
      this.ratingMakanan = this.existingRating.rating_makanan || 0;
      this.ratingPelayanan = this.existingRating.rating_pelayanan || 0;
      this.ratingAplikasi = this.existingRating.rating_aplikasi || 0;
      this.feedback = this.existingRating.komentar || '';
      this.ulasanSudahAda = true;
    }
  }

  setRating(type: 'makanan' | 'pelayanan' | 'aplikasi', value: number) {
    if (this.ulasanSudahAda || this.viewOnly) return;

    switch (type) {
      case 'makanan':
        this.ratingMakanan = value;
        break;
      case 'pelayanan':
        this.ratingPelayanan = value;
        break;
      case 'aplikasi':
        this.ratingAplikasi = value;
        break;
    }

    this.saveTemporaryRating();
  }

  saveTemporaryRating() {
    if (!this.reservasiId) return;

    const tempRating = {
      reservasi_id: this.reservasiId,
      makanan: this.ratingMakanan,
      pelayanan: this.ratingPelayanan,
      aplikasi: this.ratingAplikasi,
      feedback: this.feedback
    };

    localStorage.setItem(`temp-rating-${this.reservasiId}`, JSON.stringify(tempRating));
  }

  loadTemporaryRating() {
    const stored = localStorage.getItem(`temp-rating-${this.reservasiId}`);
    if (stored) {
      const data = JSON.parse(stored);
      this.ratingMakanan = data.makanan || 0;
      this.ratingPelayanan = data.pelayanan || 0;
      this.ratingAplikasi = data.aplikasi || 0;
      this.feedback = data.feedback || '';
    }
  }

  async simpanPenilaian() {
    if (this.ulasanSudahAda || this.viewOnly) return;

    // Validasi jika ada yang belum diberi rating
    if (
      this.ratingMakanan === 0 ||
      this.ratingPelayanan === 0 ||
      this.ratingAplikasi === 0
    ) {
      await this.presentAlert('Gagal', 'Mohon beri rating untuk semua kategori sebelum menyimpan.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Menyimpan penilaian...'
    });
    await loading.present();

    const ratingData = {
      reservasi_id: this.reservasiId,
      rating_makanan: this.ratingMakanan,
      rating_pelayanan: this.ratingPelayanan,
      rating_aplikasi: this.ratingAplikasi,
      komentar: this.feedback
    };

    this.ratingService.createRating(ratingData).subscribe({
      next: async (response) => {
        loading.dismiss();
        
        // Hapus temporary rating
        localStorage.removeItem(`temp-rating-${this.reservasiId}`);

        await this.presentAlert('Berhasil', response.message || 'Penilaian berhasil disimpan!');
        
        // Kembali ke halaman riwayat
        this.router.navigate(['/tabs/home'], { replaceUrl: true });
      },
      error: async (error) => {
        loading.dismiss();
        console.error('Error saving rating:', error);
        
        let errorMessage = 'Gagal menyimpan penilaian';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        await this.presentAlert('Error', errorMessage);
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

  // Method untuk update feedback
  onFeedbackChange() {
    if (!this.viewOnly && !this.ulasanSudahAda) {
      this.saveTemporaryRating();
    }
  }
}