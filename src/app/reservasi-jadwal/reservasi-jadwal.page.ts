/* reservasi-jadwal.page.ts */
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
  @ViewChild('calendarPopover') calendarPopover!: IonPopover;
  @ViewChild('timePopover') timePopover!: IonPopover;

  tanggal: string = '';
  waktu: string = '';
  jumlahTamu: number = 0;
  tempat: string = '';
  idMeja: string = '';  // e.g. "4,8,9"
  catatan: string = '';

  // PERUBAHAN 1: Menyederhanakan struktur waktu
  waktuList: string[] = []; // Hanya menyimpan label waktu
  bookedTimes: string[] = []; // Menyimpan waktu yang sudah dibooking
  subTimes: { time: string; disabled: boolean }[] = []; // Menyimpan waktu spesifik untuk popup dengan status

  tempatList = ['INDOOR', 'OUTDOOR', 'VVIP'];
  filteredTempatList: string[] = [];

  minDate: string = '';
  maxDate: string = '';

  selectedMainTime: string | null = null;
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

    // PERUBAHAN 2: Inisialisasi dengan semua slot waktu
    this.waktuList = this.generateTimeSlots();

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

  /** Generate waktu per 15 menit dari jam 10:00 sampai 22:00 */
  private generateTimeSlots(): string[] {
    const slots: string[] = [];
    for (let hour = 10; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }

  /** Hanya slot full-hour (menit = 00) */
  get mainTimes(): string[] {
    return this.waktuList.filter(w => w.endsWith(':00'));
  }

  async setTanggal(event: any) {
    this.tanggal = event.detail.value;
    const selectedDate = new Date(this.tanggal);
    const dateStr = this.tanggal.split('T')[0];

    // Reset waktu yang dipilih
    this.waktu = '';
    this.selectedMainTime = null;

    const loading = await this.loadingController.create({
      message: 'Memeriksa ketersediaan...',
      duration: 5000
    });
    await loading.present();

    try {
      const response = await this.reservationService.getBookedTimes(dateStr).toPromise();
      // PERUBAHAN 3: Simpan waktu yang sudah dibooking secara terpisah
      this.bookedTimes = response?.booked_times || [];
    } catch (error) {
      console.error('Gagal mengambil data waktu terbooking:', error);
      await this.presentAlert(
        'Gagal memuat jadwal tersedia. Silakan coba lagi atau pilih tanggal berbeda.',
        'Kesalahan Jaringan'
      );
      this.bookedTimes = [];
    } finally {
      await loading.dismiss();
    }

    this.calendarPopover?.dismiss();
  }

  // Buka popover sub-waktu
  openTimeDetails(event: any, mainTime: string) {
    event.stopPropagation();
    this.selectedMainTime = mainTime;
    const hour = mainTime.split(':')[0];
    
    // PERUBAHAN 4: Bangun daftar sub-waktu dengan status disabled
    this.subTimes = this.waktuList
      .filter(w => w.startsWith(hour + ':'))
      .map(time => {
        const disabled = this.isTimeDisabled(time);
        return { time, disabled };
      });

    this.timePopover.event = event;
    this.timePopover.present();
  }

  // PERUBAHAN 5: Fungsi untuk mengecek apakah waktu harus dinonaktifkan
  private isTimeDisabled(time: string): boolean {
    const selectedDate = new Date(this.tanggal);
    const [hour, minute] = time.split(':').map(Number);
    const waktuDate = new Date(selectedDate);
    waktuDate.setHours(hour, minute, 0, 0);

    const today = new Date();
    
    // Cek jika waktu sudah lewat untuk hari ini
    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date();
      if (now > waktuDate) {
        return true;
      }
    }
    
    // Cek jika waktu sudah dibooking
    return this.bookedTimes.includes(time);
  }

  selectSubTime(subTime: string) {
    this.waktu = subTime;
    this.timePopover.dismiss();
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
    
    // PERUBAHAN 6: Validasi waktu yang dipilih tidak dibooking
    if (this.bookedTimes.includes(this.waktu)) {
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

      const reservationData: ReservationData = {
        waktu_kedatangan: waktuKedatangan,
        jumlah_tamu: this.jumlahTamu,
        catatan: this.catatan || undefined,
        id_meja: mejaIdArray
      };

      this.reservationService.createReservation(reservationData).subscribe({
        next: async (response: ReservationResponse) => {
          await loading.dismiss();
          const createdReservation = response.reservasi;

          await this.presentToast('Reservasi berhasil dibuat. Silakan pilih menu Anda.', 'success');

          this.router.navigate(['/menu'], {
            state: {
              reservasi: createdReservation
            }
          });
        },
        error: async (error: ApiErrorResponse) => {
          await loading.dismiss();
          console.error('Gagal membuat reservasi:', error);
          
          let errorMessage = 'Gagal membuat reservasi. ';
          const errorBody = error.error as any;

          if (typeof errorBody === 'string') {
            errorMessage += errorBody;
          } else if (errorBody && typeof errorBody === 'object') {
            if (errorBody.message) {
              errorMessage += errorBody.message;
            }
            
            if (errorBody.available && Array.isArray(errorBody.available)) {
              errorMessage += `\n\nMeja yang tersedia: ${errorBody.available.join(', ')}`;
            }
          } else {
            errorMessage += 'Meja mungkin sudah tidak tersedia atau terjadi kesalahan lain.';
          }
          
          const alert = await this.alertController.create({
            header: 'Reservasi Gagal',
            message: errorMessage,
            buttons: [{
              text: 'Pilih Meja Lain',
              handler: () => {
                this.router.navigate(['/reservasi'], {
                  state: {
                    jumlahTamu: this.jumlahTamu,
                    tanggal: this.tanggal,
                    waktu: this.waktu,
                    tempat: this.tempat,
                    catatan: this.catatan
                  }
                });
              }
            }]
          });
          
          await alert.present();
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