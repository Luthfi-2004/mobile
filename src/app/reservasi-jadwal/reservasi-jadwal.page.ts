import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonPopover, AlertController, ToastController, LoadingController } from '@ionic/angular';

// Import service dan interface yang dibutuhkan
import { ReservationService, ReservationData, ReservationResponse, ApiErrorResponse } from '../services/reservation.service';

@Component({
  selector: 'app-reservasi-jadwal',
  templateUrl: './reservasi-jadwal.page.html',
  styleUrls: ['./reservasi-jadwal.page.scss'],
  standalone: false,
})
export class ReservasiJadwalPage implements OnInit {
  @ViewChild(IonPopover) popover!: IonPopover;

  tanggal: string = '';
  waktu: string = '';
  jumlahTamu: number = 0;
  tempat: string = '';
  idMeja: string = '';  // e.g. "4,8,9"
  catatan: string = '';

  originalWaktuList = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  waktuList: { label: string; disabled: boolean; booked: boolean }[] = [];

  tempatList = ['INDOOR', 'OUTDOOR', 'VVIP'];
  filteredTempatList: string[] = [];

  minDate: string = '';
  maxDate: string = '';

  private isSubmitting = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private reservationService: ReservationService
  ) {}

  ngOnInit() {
    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 10);

    this.minDate = today.toISOString().split('T')[0];
    this.maxDate = max.toISOString().split('T')[0];

    this.waktuList = this.originalWaktuList.map(w => ({ label: w, disabled: false, booked: false }));

    this.route.queryParams.subscribe(params => {
      if (params['jumlahKursi']) {
        this.jumlahTamu = Number(params['jumlahKursi']);
      }
      if (params['tempat']) {
        const selectedPlaces = (params['tempat'] as string).split(',');
        this.filteredTempatList = this.tempatList.filter(t => selectedPlaces.includes(t));
        if (this.filteredTempatList.length > 0 && !this.tempat) {
          this.tempat = this.filteredTempatList[0];
        }
      } else {
        this.filteredTempatList = [...this.tempatList];
      }
      if (params['idMeja']) {
        this.idMeja = params['idMeja'];
      }
    });
  }

  async setTanggal(event: any) {
  this.tanggal = event.detail.value;
  const selectedDate = new Date(this.tanggal);
  const today = new Date();
  const dateStr = this.tanggal.split('T')[0];

    // Reset waktu yang dipilih jika tanggal berubah
    this.waktu = '';

    const loading = await this.loadingController.create({
    message: 'Memeriksa ketersediaan...',
    duration: 5000 // Auto dismiss after 5 seconds
  });
  await loading.present();

    // Ambil data waktu yang sudah dibooking dari server
     try {
    const response = await this.reservationService.getBookedTimes(dateStr).toPromise();
    const bookedTimes = response?.booked_times || [];
    console.log('Booked times:', bookedTimes);

      // Update waktuList: nonaktifkan jika sudah dibooking atau (untuk hari ini) waktu sudah lewat
      this.waktuList = this.originalWaktuList.map(waktu => {
      const [hour, minute] = waktu.split(':').map(Number);
      const waktuDate = new Date(selectedDate);
      waktuDate.setHours(hour, minute, 0, 0);

        // Cek apakah waktu ini sudah dibooking
        const isBooked = bookedTimes.includes(waktu);

        // Untuk hari ini, cek juga apakah waktu sudah lewat
        if (selectedDate.toDateString() === today.toDateString()) {
          const now = new Date();
          const disabled = isBooked || (now > waktuDate);
          return { label: waktu, disabled, booked: isBooked };
        } else {
          return { label: waktu, disabled: isBooked, booked: isBooked };
        }
      });
    } catch (error) {
    console.error('Gagal mengambil data waktu terbooking:', error);
    await this.presentAlert(
      'Gagal memuat jadwal tersedia. Silakan coba lagi atau pilih tanggal berbeda.',
      'Kesalahan Jaringan'
    );
      // Fallback: nonaktifkan hanya berdasarkan waktu lewat (untuk hari ini)
    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date();
      this.waktuList = this.originalWaktuList.map(waktu => {
        const [hour, minute] = waktu.split(':').map(Number);
        const waktuDate = new Date();
        waktuDate.setHours(hour, minute, 0, 0);
        return { label: waktu, disabled: now > waktuDate, booked: false };
      });
    } else {
      this.waktuList = this.originalWaktuList.map(waktu => ({
        label: waktu,
        disabled: false,
        booked: false
      }));
    }
  } finally {
    await loading.dismiss();
  }

  if (this.popover) {
    this.popover.dismiss();
  }
}

  async presentAlert(message: string, header: string = 'Peringatan') {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }

  private formatWaktuKedatangan(): string {
    if (!this.tanggal || !this.waktu) {
      throw new Error('Tanggal dan waktu harus diisi');
    }
    const dateOnly = this.tanggal.split('T')[0];
    const [hour, minute] = this.waktu.split(':');
    return `${dateOnly} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
  }

  private validateDateTime(): { isValid: boolean; message?: string } {
    if (!this.tanggal || !this.waktu) {
      return { isValid: false, message: 'Tanggal dan waktu harus diisi' };
    }
    try {
      const wk = new Date(this.formatWaktuKedatangan());
      const now = new Date();
      const minTime = new Date(now.getTime() + 15 * 60 * 1000);
      if (isNaN(wk.getTime())) {
        return { isValid: false, message: 'Format tanggal/waktu tidak valid' };
      }
      if (wk < minTime) {
        return { isValid: false, message: 'Waktu reservasi minimal 15 menit dari sekarang' };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, message: 'Format tanggal/waktu tidak valid' };
    }
  }

  async konfirmasi() {
    if (this.isSubmitting) {
      return;
    }

    // Validasi input dasar
    if (!this.tanggal || !this.waktu || !this.tempat) {
      await this.presentAlert('Harap lengkapi semua data reservasi!');
      return;
    }
    
    // Validasi waktu yang dipilih tidak dibooking
    const selectedTime = this.waktuList.find(w => w.label === this.waktu);
    if (selectedTime?.booked) {
      await this.presentAlert('Waktu yang dipilih sudah tidak tersedia. Silakan pilih waktu lain.');
      return;
    }

    const validation = this.validateDateTime();
    if (!validation.isValid) {
      await this.presentAlert(validation.message || 'Format tanggal/waktu tidak valid');
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Membuat reservasi...',
    });
    await loading.present();

    try {
      const waktuKedatangan = this.formatWaktuKedatangan();
      const mejaIdArray: number[] = this.idMeja
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));

      // Siapkan payload untuk dikirim ke API
      const reservationData: ReservationData = {
        waktu_kedatangan: waktuKedatangan,
        jumlah_tamu: this.jumlahTamu,
        catatan: this.catatan || undefined,
        id_meja: mejaIdArray
      };

      // Panggil service untuk membuat reservasi di backend
      this.reservationService.createReservation(reservationData).subscribe({
        next: async (response: ReservationResponse) => {
          await loading.dismiss();
          const createdReservation = response.reservasi;

          await this.presentToast('Reservasi berhasil dibuat. Silakan pilih menu Anda.', 'success');

          // Navigasi ke halaman menu
          this.router.navigate(['/menu'], {
            state: {
              reservasi: createdReservation
            }
          });
        },
        error: async (error: ApiErrorResponse) => {
          await loading.dismiss();
          console.error('Gagal membuat reservasi:', error);
          const errorMessage = error.message || 'Gagal membuat reservasi. Meja mungkin sudah tidak tersedia atau terjadi kesalahan lain.';
          await this.presentAlert(errorMessage, 'Reservasi Gagal');
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } catch (err: any) {
      await loading.dismiss();
      console.error('Error saat menyiapkan data reservasi:', err);
      await this.presentAlert('Gagal menyiapkan data untuk reservasi. Coba lagi.');
      this.isSubmitting = false;
    }
  }
}