// src/app/reservasi-jadwal/reservasi-jadwal.page.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonPopover,
  AlertController,
  ToastController
} from '@ionic/angular';
import { ReservationData } from '../services/reservation.service';

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
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Atur batas tanggal (hari ini + 10 hari ke depan)
    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 10);

    this.minDate = today.toISOString().split('T')[0];
    this.maxDate = max.toISOString().split('T')[0];

    // Inisialisasi daftar waktu (semua enabled)
    this.waktuList = this.originalWaktuList.map(w => ({ label: w, disabled: false }));

    // Ambil params: jumlahKursi, tempat, idMeja
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
      console.log('Debug ngOnInit: idMeja =', this.idMeja);
    });
  }

  setTanggal(event: any) {
    this.tanggal = event.detail.value;
    const selectedDate = new Date(this.tanggal);
    const today = new Date();

    // Jika tanggal sama dengan hari ini, disable waktu yang sudah lewat
    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date();
      this.waktuList = this.originalWaktuList.map(waktu => {
        const [hour, minute] = waktu.split(':').map(Number);
        const waktuDate = new Date();
        waktuDate.setHours(hour, minute, 0, 0);
        return { label: waktu, disabled: now > waktuDate };
      });
      const sel = this.waktuList.find(w => w.label === this.waktu);
      if (!sel || sel.disabled) {
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
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    return `${dateOnly} ${formattedHour}:${formattedMinute}:00`;
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
    if (!this.tanggal || !this.tempat) {
      await this.presentAlert('Harap lengkapi semua data reservasi!');
      return;
    }
    const adaWaktuAktif = this.waktuList.some(w => !w.disabled);
    if (!adaWaktuAktif) {
      await this.presentAlert('Toko tutup dan tidak menerima reservasi lagi pada hari ini.');
      return;
    }
    if (!this.waktu) {
      await this.presentAlert('Harap pilih waktu kedatangan!');
      return;
    }
    const validation = this.validateDateTime();
    if (!validation.isValid) {
      await this.presentAlert(validation.message || 'Format tanggal/waktu tidak valid');
      return;
    }

    const selDate = new Date(this.tanggal.split('T')[0]);
    const now = new Date();
    if (selDate.toDateString() === now.toDateString()) {
      const [hStr, mStr] = this.waktu.split(':');
      const rh = Number(hStr), rm = Number(mStr);
      const rd = new Date();
      rd.setHours(rh, rm, 0, 0);
      if (now > rd) {
        await this.presentAlert('Toko tutup dan tidak menerima reservasi lagi pada hari ini.');
        return;
      }
    }

    this.isSubmitting = true;
    try {
      const waktuKedatangan = this.formatWaktuKedatangan();

      // Parse idMeja menjadi array angka
      let mejaIdArray: number[] = [];
      if (this.idMeja) {
        mejaIdArray = this.idMeja
          .split(',')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n));
      }

      const reservationData: ReservationData = {
        waktu_kedatangan: waktuKedatangan,
        jumlah_tamu: this.jumlahTamu,
        catatan: this.catatan || undefined,
        id_meja: mejaIdArray
      };

      // Simpan sementara di localStorage
      localStorage.setItem('pendingReservation', JSON.stringify({
        ...reservationData,
        tempat: this.tempat
      }));

      // Tampilkan toast, lalu redirect ke halaman /menu
      await this.presentToast('Data reservasi disimpan sementara. Silakan pilih menu dan lanjut ke keranjang.', 'primary');
      this.router.navigate(['/menu'], {
        queryParams: {
          // Anda bisa terus meneruskan idMeja jika perlu di menu
          idMeja: this.idMeja,
          jumlahTamu: this.jumlahTamu,
          tempat: this.tempat
        }
      });
    } catch (err) {
      console.error('Error menyiapkan data reservasi:', err);
      await this.presentAlert('Gagal menyiapkan data reservasi. Coba lagi.');
    } finally {
      this.isSubmitting = false;
    }
  }
}
