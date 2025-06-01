import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifikasi',
  templateUrl: './notifikasi.page.html',
  styleUrls: ['./notifikasi.page.scss'],
  standalone: false
})
export class NotifikasiPage implements OnInit {
  notifikasi: any[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadNotifikasi();
    this.jadwalkanPengingat1Jam();
  }

  loadNotifikasi() {
    const transaksi = JSON.parse(localStorage.getItem('lastTransaction') || 'null');
    const existingNotif = JSON.parse(localStorage.getItem('notifikasiList') || '[]');
    this.notifikasi = existingNotif;

    if (transaksi) {
      const status = transaksi.status || 'Pembayaran Sukses';
      const tanggal = transaksi.tanggal || new Date().toLocaleDateString();
      const dibayar = transaksi.dibayar || 0;
      const transaksiId = transaksi.id || 0;

      const sudahAda = existingNotif.some(
        (n: any) => n.id === transaksiId && n.tipe === 'pembayaran'
      );

      if (!sudahAda) {
        const newNotif = {
          judul: 'Pembayaran Diterima',
          deskripsi: `Pembayaran Anda sebesar Rp${dibayar} untuk reservasi pada tanggal ${tanggal} telah diterima.`,
          tanggal: tanggal,
          status: status,
          id: transaksiId,
          totalPembayaran: dibayar,
          tipe: 'pembayaran'
        };
        this.notifikasi.unshift(newNotif);

        // Pengingat awal (umum)
        if (transaksi.waktu) {
          const jadwalDatang = new Date(transaksi.waktu);
          const jamDatang = jadwalDatang.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const tanggalDatang = jadwalDatang.toLocaleDateString();

          const newReminderNotif = {
            judul: 'Pengingat Kehadiran',
            deskripsi: `Jangan lupa hadir sebelum pukul ${jamDatang} pada ${tanggalDatang}. Disarankan datang 2 jam lebih awal.`,
            tanggal: new Date().toLocaleDateString(),
            status: 'Pengingat',
            id: transaksiId,
            totalPembayaran: 0,
            tipe: 'pengingat'
          };

          this.notifikasi.unshift(newReminderNotif);
        }

        // Simpan kembali
        localStorage.setItem('notifikasiList', JSON.stringify(this.notifikasi));
      }
    }
  }

  jadwalkanPengingat1Jam() {
    const history = JSON.parse(localStorage.getItem('transactionHistory') || '[]');
    const existingNotif = JSON.parse(localStorage.getItem('notifikasiList') || '[]');

    let updated = false;

    history.forEach((trx: any) => {
      if (trx.reservasi && trx.reservasi.waktu) {
        const waktuReservasi = new Date(trx.reservasi.waktu).getTime();
        const waktuSekarang = new Date().getTime();
        const satuJamSebelum = waktuReservasi - 60 * 60 * 1000;

        const sudahAda = existingNotif.some(
          (n: any) => n.id === trx.id && n.tipe === 'pengingat1jam'
        );

        if (waktuSekarang >= satuJamSebelum && waktuSekarang < waktuReservasi && !sudahAda) {
          const waktuDatang = new Date(trx.reservasi.waktu);
          const jamDatang = waktuDatang.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const tanggalDatang = waktuDatang.toLocaleDateString();

          const reminderNotif = {
            judul: 'Pengingat Kehadiran (1 Jam Sebelum)',
            deskripsi: `Acara Anda dimulai pukul ${jamDatang} pada ${tanggalDatang}. Segera bersiap-siap!`,
            tanggal: new Date().toLocaleDateString(),
            status: 'Pengingat',
            id: trx.id,
            totalPembayaran: 0,
            tipe: 'pengingat1jam'
          };

          existingNotif.unshift(reminderNotif);
          updated = true;
        }
      }
    });

    if (updated) {
      this.notifikasi = existingNotif;
      localStorage.setItem('notifikasiList', JSON.stringify(existingNotif));
    }
  }

  getBadgeColor(status: string): string {
    switch (status) {
      case 'Pending': return 'danger';
      case 'Berhasil': return 'success';
      case 'Pembayaran Sukses': return 'primary';
      case 'Pengingat': return 'warning';
      default: return 'medium';
    }
  }

}