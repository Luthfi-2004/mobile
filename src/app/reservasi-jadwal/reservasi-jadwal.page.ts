import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-reservasi-jadwal',
  templateUrl: './reservasi-jadwal.page.html',
  styleUrls: ['./reservasi-jadwal.page.scss'],
  standalone: false,
})
export class ReservasiJadwalPage implements OnInit {
  tanggal: string = '';
  waktu: string = '';
  jumlahTamu: number = 0;
  tempat: string = '';

  waktuList = ['11.00', '12.00', '13.00', '14:00', '15:00', '16:00'];
  tempatList = ['INDOOR', 'OUTDOOR', 'VVIP'];
  filteredTempatList: string[] = [];
  showDateModal = false;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      // Set jumlah tamu
      if (params['jumlahKursi']) {
        this.jumlahTamu = Number(params['jumlahKursi']);
      }

      // Filter tempat berdasarkan pilihan user
      if (params['tempat']) {
        const selectedPlaces = params['tempat'].split(',');
        this.filteredTempatList = this.tempatList.filter(t => 
          selectedPlaces.includes(t)
        );
        
        // Set tempat pertama sebagai default jika belum dipilih
        if (this.filteredTempatList.length > 0 && !this.tempat) {
          this.tempat = this.filteredTempatList[0];
        }
      } else {
        this.filteredTempatList = [...this.tempatList];
      }
    });
  }

  openDate() {
    this.showDateModal = true;
  }
  
  setTanggal(event: any) {
    this.tanggal = event.detail.value;
    this.showDateModal = false;
  }

  konfirmasi() {
    if (!this.tanggal || !this.waktu || !this.tempat) {
      alert('Harap lengkapi semua data reservasi!');
      return;
    }

    this.router.navigate(['/reservasi'], {
      queryParams: {
        tanggal: this.tanggal,
        waktu: this.waktu,
        jumlahTamu: this.jumlahTamu,
        tempat: this.tempat
      }
    });
  }
}