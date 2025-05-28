import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonPopover, AlertController } from '@ionic/angular';

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

  originalWaktuList = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  waktuList: { label: string; disabled: boolean }[] = [];

  tempatList = ['INDOOR', 'OUTDOOR', 'VVIP'];
  filteredTempatList: string[] = [];

  minDate: string = '';
  maxDate: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController
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
    this.tanggal = event.detail.value; // tanggal string ISO, contoh: "2025-05-28"
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

      // Reset pilihan waktu jika waktu sekarang sudah lewat
      const selectedWaktuObj = this.waktuList.find(w => w.label === this.waktu);
      if (!selectedWaktuObj || selectedWaktuObj.disabled) {
        this.waktu = '';
      }
    } else {
      // Jika bukan hari ini, semua waktu aktif
      this.waktuList = this.originalWaktuList.map(waktu => ({ label: waktu, disabled: false }));
    }

    if (this.popover) {
      this.popover.dismiss();
    }
  }

  async presentAlert() {
    const alert = await this.alertController.create({
      header: 'Peringatan',
      message: 'Harap lengkapi semua data reservasi!',
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
async konfirmasi() {
  if (!this.tanggal || !this.tempat) {
    await this.presentAlert();
    return;
  }

  // Cek apakah ada waktu yang enabled (belum lewat)
  const adaWaktuAktif = this.waktuList.some(w => !w.disabled);

  if (!adaWaktuAktif) {
    // Semua waktu disabled, berarti toko tutup hari ini
    await this.showTokoTutupAlert();
    return;
  }

  // Jika ada waktu aktif tapi user belum memilih waktu
  if (!this.waktu) {
    await this.presentAlert();
    return;
  }

  // Validasi tanggal valid
  const selectedDate = new Date(this.tanggal);
  if (isNaN(selectedDate.getTime())) {
    await this.presentAlert();
    return;
  }

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

  // Semua valid, lanjut ke halaman menu
  this.router.navigate(['/menu'], {
    queryParams: {
      tanggal: this.tanggal,
      waktu: this.waktu,
      jumlahTamu: this.jumlahTamu,
      tempat: this.tempat,
      idMeja: this.idMeja
    }
  });
}

}
