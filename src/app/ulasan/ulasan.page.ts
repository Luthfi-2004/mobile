import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

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
  ulasanSudahAda: boolean = false;
  feedback: string = '';

  constructor(
    private router: Router,
    private alertController: AlertController
  ) {
    const nav = this.router.getCurrentNavigation();
    this.pesanan = nav?.extras?.state?.['pesanan'];

    if (this.pesanan) {
      this.loadExistingUlasan(this.pesanan.id);
      if (!this.ulasanSudahAda) {
        this.loadTemporaryRating(this.pesanan.id);
      }
    }
  }

  setRating(type: 'makanan' | 'pelayanan' | 'aplikasi', value: number) {
    if (this.ulasanSudahAda) return;

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
    if (!this.pesanan?.id) return;

    const tempRating = {
      id: this.pesanan.id,
      makanan: this.ratingMakanan,
      pelayanan: this.ratingPelayanan,
      aplikasi: this.ratingAplikasi,
      feedback: this.feedback
    };

    localStorage.setItem(`ulasan-${this.pesanan.id}`, JSON.stringify(tempRating));
  }

  loadTemporaryRating(pesananId: string) {
    const stored = localStorage.getItem(`ulasan-${pesananId}`);
    if (stored) {
      const data = JSON.parse(stored);
      this.ratingMakanan = data.makanan || 0;
      this.ratingPelayanan = data.pelayanan || 0;
      this.ratingAplikasi = data.aplikasi || 0;
      this.feedback = data.feedback || '';
    }
  }

  loadExistingUlasan(pesananId: string) {
    const existing = JSON.parse(localStorage.getItem('penilaian') || '[]');
    const ulasan = existing.find((p: any) => p.idPesanan === pesananId);

    if (ulasan) {
      this.ratingMakanan = ulasan.makanan;
      this.ratingPelayanan = ulasan.pelayanan;
      this.ratingAplikasi = ulasan.aplikasi;
      this.feedback = ulasan.feedback || '';
      this.ulasanSudahAda = true;
    }
  }

  async simpanPenilaian() {
    if (this.ulasanSudahAda) return;

    // Validasi jika ada yang belum diberi rating
    if (
      this.ratingMakanan === 0 ||
      this.ratingPelayanan === 0 ||
      this.ratingAplikasi === 0
    ) {
      const alert = await this.alertController.create({
        header: 'Gagal',
        message: 'Mohon beri rating untuk semua kategori sebelum menyimpan.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const penilaian = {
      idPesanan: this.pesanan?.id,
      tanggal: new Date().toLocaleString(),
      makanan: this.ratingMakanan,
      pelayanan: this.ratingPelayanan,
      aplikasi: this.ratingAplikasi,
      feedback: this.feedback
    };

    const existing = JSON.parse(localStorage.getItem('penilaian') || '[]');
    existing.push(penilaian);
    localStorage.setItem('penilaian', JSON.stringify(existing));

    localStorage.removeItem(`ulasan-${this.pesanan?.id}`);

    const alert = await this.alertController.create({
      header: 'Berhasil',
      message: 'Penilaian berhasil disimpan!',
      buttons: ['OK']
    });

    await alert.present();
    await alert.onDidDismiss();

    this.router.navigate(['/riwayat'], { replaceUrl: true });
  }
}
