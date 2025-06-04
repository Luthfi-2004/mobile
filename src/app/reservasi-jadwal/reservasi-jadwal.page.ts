import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonPopover, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { ReservationService, ReservationData } from '../services/reservation.service';

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
  idMeja: string = ''; 
  catatan: string = '';

  originalWaktuList = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  waktuList: { label: string; disabled: boolean }[] = [];

  tempatList = ['INDOOR', 'OUTDOOR', 'VVIP'];
  filteredTempatList: string[] = [];

  minDate: string = '';
  maxDate: string = '';

  private isSubmitting = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private reservationService: ReservationService
  ) {}

  ngOnInit() {
    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 10);

    this.minDate = today.toISOString().split('T')[0];
    this.maxDate = max.toISOString().split('T')[0];

    this.waktuList = this.originalWaktuList.map(waktu => ({ label: waktu, disabled: false }));

    this.route.queryParams.subscribe(params => {
      if (params['jumlahKursi']) {
        this.jumlahTamu = Number(params['jumlahKursi']);
      }

      if (params['tempat']) {
        const selectedPlaces = params['tempat'].split(',');
        this.filteredTempatList = this.tempatList.filter(t =>
          selectedPlaces.includes(t)
        );

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

  setTanggal(event: any) {
    this.tanggal = event.detail.value;
    const selectedDate = new Date(this.tanggal);
    const today = new Date();

    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date();
      this.waktuList = this.originalWaktuList.map(waktu => {
        const [hour, minute] = waktu.split(':').map(Number);
        const waktuDate = new Date();
        waktuDate.setHours(hour, minute, 0, 0);

        return {
          label: waktu,
          disabled: now > waktuDate
        };
      });

      const selectedWaktuObj = this.waktuList.find(w => w.label === this.waktu);
      if (!selectedWaktuObj || selectedWaktuObj.disabled) {
        this.waktu = '';
      }
    } else {
      this.waktuList = this.originalWaktuList.map(waktu => ({ label: waktu, disabled: false }));
    }

    if (this.popover) {
      this.popover.dismiss();
    }
  }

  async presentAlert(message: string = 'Harap lengkapi semua data reservasi!') {
    const alert = await this.alertController.create({
      header: 'Peringatan',
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }

  async showTokoTutupAlert() {
    const alert = await this.alertController.create({
      header: 'Peringatan',
      message: 'Toko tutup dan tidak menerima reservasi lagi pada hari ini.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  private formatWaktuKedatangan(): string {
    // Pastikan format sesuai dengan yang diharapkan Laravel: YYYY-MM-DD HH:mm:ss
    if (!this.tanggal || !this.waktu) {
      throw new Error('Tanggal dan waktu harus diisi');
    }

    // Parse tanggal dari ISO format (YYYY-MM-DD)
    const dateOnly = this.tanggal.split('T')[0]; // Ambil bagian tanggal saja jika ada 'T'
    
    // Parse waktu dan pastikan format HH:mm
    const [hour, minute] = this.waktu.split(':');
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    
    const result = `${dateOnly} ${formattedHour}:${formattedMinute}:00`;
    
    console.log('Formatted waktu_kedatangan:', result);
    return result;
  }

  private validateDateTime(): { isValid: boolean; message?: string } {
    if (!this.tanggal || !this.waktu) {
      return { isValid: false, message: 'Tanggal dan waktu harus diisi' };
    }

    try {
      const waktuKedatangan = new Date(this.formatWaktuKedatangan());
      const now = new Date();
      const minTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 menit dari sekarang

      if (isNaN(waktuKedatangan.getTime())) {
        return { isValid: false, message: 'Format tanggal/waktu tidak valid' };
      }

      if (waktuKedatangan < minTime) {
        return { isValid: false, message: 'Waktu reservasi minimal 15 menit dari sekarang' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, message: 'Format tanggal/waktu tidak valid' };
    }
  }

  async konfirmasi() {
    if (this.isSubmitting) {
      return;
    }

    // Validasi form
    if (!this.tanggal || !this.tempat) {
      await this.presentAlert('Harap lengkapi semua data reservasi!');
      return;
    }

    const adaWaktuAktif = this.waktuList.some(w => !w.disabled);

    if (!adaWaktuAktif) {
      await this.showTokoTutupAlert();
      return;
    }

    if (!this.waktu) {
      await this.presentAlert('Harap pilih waktu kedatangan!');
      return;
    }

    // Validasi datetime
    const validation = this.validateDateTime();
    if (!validation.isValid) {
      await this.presentAlert(validation.message || 'Format tanggal/waktu tidak valid');
      return;
    }

    // Validasi untuk hari ini
    const selectedDate = new Date(this.tanggal.split('T')[0]);
    const now = new Date();

    if (selectedDate.toDateString() === now.toDateString()) {
      const [hourStr, minuteStr] = this.waktu.split(':');
      const reservasiHour = Number(hourStr);
      const reservasiMinute = Number(minuteStr);

      const reservasiDate = new Date();
      reservasiDate.setHours(reservasiHour, reservasiMinute, 0, 0);

      if (now > reservasiDate) {
        await this.showTokoTutupAlert();
        return;
      }
    }

    await this.submitReservation();
  }

  async submitReservation() {
    const loading = await this.loadingController.create({
      message: 'Membuat reservasi...',
      spinner: 'crescent'
    });

    await loading.present();
    this.isSubmitting = true;

    try {
      const waktuKedatangan = this.formatWaktuKedatangan();
      
      const reservationData: ReservationData = {
        waktu_kedatangan: waktuKedatangan,
        jumlah_tamu: this.jumlahTamu,
        catatan: this.catatan || undefined
      };

      console.log('Sending reservation data:', reservationData);

      const response = await this.reservationService.createReservation(reservationData).toPromise();

      await loading.dismiss();
      this.isSubmitting = false;

      if (response && response.reservasi) {
        await this.presentToast('Reservasi berhasil dibuat!', 'success');
        
        // Navigate ke halaman menu dengan data reservasi
        this.router.navigate(['/menu'], {
          queryParams: {
            reservasiId: response.reservasi.id,
            kodeReservasi: response.reservasi.kode_reservasi,
            tanggal: this.tanggal,
            waktu: this.waktu,
            jumlahTamu: this.jumlahTamu,
            tempat: this.tempat,
            idMeja: response.reservasi.meja_id
          }
        });
      }

    } catch (error: any) {
      await loading.dismiss();
      this.isSubmitting = false;

      console.error('Reservation error:', error);

      let errorMessage = 'Terjadi kesalahan saat membuat reservasi.';
      
      if (error.error) {
        if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.errors) {
          // Handle Laravel validation errors
          const errors = error.error.errors;
          const firstErrorKey = Object.keys(errors)[0];
          const firstError = errors[firstErrorKey];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      await this.presentAlert(errorMessage);
    }
  }
}