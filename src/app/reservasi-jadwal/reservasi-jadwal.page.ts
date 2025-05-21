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

  waktuList = ['11.00', '12.00', '13.00', '14:00', '15:00', '16:00'];
  tempatList = ['INDOOR', 'OUTDOOR', 'VVIP'];
  filteredTempatList: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController
  ) {}

  ngOnInit() {
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
        this.idMeja = params['idMeja']; // ✅ Ambil idMeja dari query params
      }
    });
  }

  setTanggal(event: any) {
    this.tanggal = event.detail.value;
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

  konfirmasi() {
    if (!this.tanggal || !this.waktu || !this.tempat) {
      this.presentAlert();
      return;
    }

    this.router.navigate(['/menu'], {
      queryParams: {
        tanggal: this.tanggal,
        waktu: this.waktu,
        jumlahTamu: this.jumlahTamu,
        tempat: this.tempat,
        idMeja: this.idMeja // ✅ Teruskan idMeja ke halaman berikutnya
      }
    });
  }
}
