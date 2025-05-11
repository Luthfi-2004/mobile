import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifikasi',
  templateUrl: './notifikasi.page.html',
  styleUrls: ['./notifikasi.page.scss'],
  standalone: false
})
export class NotifikasiPage {
  notifikasi = [
    {
      judul: 'Reservasi Berhasil',
      deskripsi: 'Reservasi Anda untuk tanggal 30 Mei pukul 04.00 telah berhasil.',
      id: 123
    },
    {
      judul: 'Kedatangan Reservasi',
      deskripsi: 'Jangan lewatkan reservasi Anda hari ini pada jam 17.00!',
      id: 124
    }
  ];

  constructor(private router: Router) {}

  goToDetail(notif: any) {
    this.router.navigate(['/detail-pesanan'], { state: { data: notif } });
  }

  goToRating(notif: any) {
    this.router.navigate(['/ulasan'], { state: { data: notif } });
  }
}
