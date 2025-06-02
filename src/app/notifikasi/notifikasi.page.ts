import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LocalNotifications } from '@capacitor/local-notifications';

@Component({
  selector: 'app-notifikasi',
  templateUrl: './notifikasi.page.html',
  styleUrls: ['./notifikasi.page.scss'],
  standalone: false
})
export class NotifikasiPage implements OnInit, OnDestroy {
  notifikasi: any[] = [];
  private intervalId: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.initNotifications();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async initNotifications() {
    // Minta izin notifikasi di device
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
      console.warn('Izin notifikasi tidak diberikan');
      return;
    }

    this.loadNotifikasi();

    // Jalankan pengecekan pengingat berkala setiap 30 detik
    this.intervalId = setInterval(() => {
      this.jadwalkanPengingat1Jam();
      this.jadwalkanPengingat5Menit();
    }, 30000);

    // Supaya langsung cek saat halaman dibuka (tidak menunggu interval)
    this.jadwalkanPengingat1Jam();
    this.jadwalkanPengingat5Menit();
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
          const jadwalDatang = this.parseReservasiWaktu(transaksi.waktu);
          if (jadwalDatang) {
            const jamDatang = jadwalDatang.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const tanggalDatang = jadwalDatang.toLocaleDateString();

            const newReminderNotif = {
              judul: 'Pengingat Kehadiran',
              deskripsi: `Jangan lupa hadir sebelum pukul ${jamDatang} pada ${tanggalDatang}. Disarankan datang 30 menit lebih awal.`,
              tanggal: new Date().toLocaleDateString(),
              status: 'Pengingat',
              id: transaksiId,
              totalPembayaran: 0,
              tipe: 'pengingat'
            };

            this.notifikasi.unshift(newReminderNotif);
          }
        }

        localStorage.setItem('notifikasiList', JSON.stringify(this.notifikasi));
      }
    }
  }

  async jadwalkanPengingat1Jam() {
    const history = JSON.parse(localStorage.getItem('transactionHistory') || '[]');
    const existingNotif = JSON.parse(localStorage.getItem('notifikasiList') || '[]');

    let updated = false;
    const now = new Date().getTime();

    for (const trx of history) {
      if (trx.reservasi && trx.reservasi.waktu) {
        const waktuReservasi = this.parseReservasiWaktu(trx.reservasi.waktu);
        if (!waktuReservasi) {
          console.error('Invalid date trx.reservasi.waktu:', trx.reservasi.waktu);
          continue;
        }

        const waktuReservasiMs = waktuReservasi.getTime();
        const satuJamSebelum = waktuReservasiMs - 60 * 60 * 1000;

        const sudahAda = existingNotif.some(
          (n: any) => n.id === trx.id && n.tipe === 'pengingat1jam'
        );

        if (now >= satuJamSebelum && now < waktuReservasiMs && !sudahAda) {
          const jamDatang = waktuReservasi.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const tanggalDatang = waktuReservasi.toLocaleDateString();

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

          // Kirim local notification ke device
          await LocalNotifications.schedule({
            notifications: [
              {
                id: trx.id,
                title: reminderNotif.judul,
                body: reminderNotif.deskripsi,
                schedule: { at: new Date(satuJamSebelum) },
                sound: undefined,
                attachments: undefined,
                actionTypeId: '',
                extra: null
              }
            ]
          });
        }
      }
    }

    if (updated) {
      this.notifikasi = existingNotif;
      localStorage.setItem('notifikasiList', JSON.stringify(existingNotif));
    }
  }

  async jadwalkanPengingat5Menit() {
    const history = JSON.parse(localStorage.getItem('transactionHistory') || '[]');
    const existingNotif = JSON.parse(localStorage.getItem('notifikasiList') || '[]');

    let updated = false;
    const now = new Date().getTime();

    for (const trx of history) {
      if (trx.reservasi && trx.reservasi.waktu) {
        const waktuReservasi = this.parseReservasiWaktu(trx.reservasi.waktu);
        if (!waktuReservasi) {
          console.error('Invalid date trx.reservasi.waktu:', trx.reservasi.waktu);
          continue;
        }

        const waktuReservasiMs = waktuReservasi.getTime();
        const limaMenitSebelum = waktuReservasiMs - 5 * 60 * 1000;

        const sudahAda = existingNotif.some(
          (n: any) => n.id === trx.id && n.tipe === 'pengingat5menit'
        );

        if (now >= limaMenitSebelum && now < waktuReservasiMs && !sudahAda) {
          const jamDatang = waktuReservasi.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const tanggalDatang = waktuReservasi.toLocaleDateString();

          const reminderNotif = {
            judul: 'Pengingat Kehadiran (5 Menit Sebelum)',
            deskripsi: `5 menit lagi, reservasi Anda di jam ${jamDatang} pada ${tanggalDatang}. Harap sudah berada di tempat!`,
            tanggal: new Date().toLocaleDateString(),
            status: 'Pengingat',
            id: trx.id,
            totalPembayaran: 0,
            tipe: 'pengingat5menit'
          };

          existingNotif.unshift(reminderNotif);
          updated = true;

          // Kirim local notification ke device
          await LocalNotifications.schedule({
            notifications: [
              {
                id: trx.id + 1000, // supaya id unik beda dari pengingat1jam
                title: reminderNotif.judul,
                body: reminderNotif.deskripsi,
                schedule: { at: new Date(limaMenitSebelum) },
                sound: undefined,
                attachments: undefined,
                actionTypeId: '',
                extra: null
              }
            ]
          });
        }
      }
    }

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

  // Fungsi bantu untuk parsing waktu reservasi yang hanya berisi jam (misal "14:00" atau "11.00")
  parseReservasiWaktu(waktu: string): Date | null {
    if (!waktu) return null;

    // Ganti titik (.) jadi titik dua (:) jika ada
    const waktuFix = waktu.replace('.', ':');

    // Gabungkan dengan tanggal hari ini supaya jadi string tanggal lengkap valid
    const hariIni = new Date();
    const tanggalString = hariIni.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Bentuk format ISO lengkap, contoh: "2025-06-02T14:00:00"
    const fullDateStr = `${tanggalString}T${waktuFix}:00`;

    const parsedDate = new Date(fullDateStr);

    if (isNaN(parsedDate.getTime())) {
      console.error('Gagal parsing waktu reservasi:', waktu);
      return null;
    }
    return parsedDate;
  }
}
