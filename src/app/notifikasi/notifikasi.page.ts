import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifikasi',
  templateUrl: './notifikasi.page.html',
  styleUrls: ['./notifikasi.page.scss'],
  standalone: false
})
export class NotifikasiPage {
  notifikasi: any[] = [];

  constructor(private router: Router) {
    this.loadNotifikasi();
  }

  // Fungsi untuk mengambil data dari localStorage dan menambahkan notifikasi
  loadNotifikasi() {
    // Ambil data transaksi dari localStorage
    const transaksi = JSON.parse(localStorage.getItem('lastTransaction') || 'null');

    if (transaksi) {
      // Pastikan data transaksi memiliki nilai yang dibutuhkan
      const status = transaksi.status || 'Pembayaran Sukses'; // Menangani jika status tidak ada
      const tanggal = transaksi.tanggal || new Date().toLocaleDateString(); // Tanggal default jika tidak ada
      const dibayar = transaksi.dibayar || 0; // Nilai default untuk dibayar jika tidak ada

      // Buat notifikasi berdasarkan data transaksi yang valid
      const newNotif = {
        judul: 'Pembayaran Diterima',
        deskripsi: `Pembayaran Anda sebesar Rp${dibayar} untuk reservasi pada tanggal ${tanggal} telah diterima.`,
        tanggal: tanggal,
        status: status,
        id: transaksi.id || 0, // ID default jika tidak ada
        totalPembayaran: dibayar
      };

      this.notifikasi.push(newNotif);
    }
  }

  // Navigasi ke halaman detail pesanan ketika notifikasi diklik
  goToDetail(notif: any) {
    this.router.navigate(['/detail-pesanan'], { state: { data: notif } });
  }

  // Navigasi ke halaman invoice ketika notifikasi menunjukkan pembayaran pending
  goToInvoice(notif: any) {
    this.router.navigate(['/invoice'], { state: { data: notif } });
  }

  // Navigasi ke halaman ulasan ketika status notifikasi adalah selesai
  goToRating(notif: any) {
    this.router.navigate(['/ulasan'], { state: { data: notif } });
  }
}