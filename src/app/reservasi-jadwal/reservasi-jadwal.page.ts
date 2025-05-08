import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reservasi-jadwal',
  templateUrl: './reservasi-jadwal.page.html',
  styleUrls: ['./reservasi-jadwal.page.scss'],
  standalone: false,
})
export class ReservasiJadwalPage {
  tanggal: string = '';
  waktu: string = '';
  jumlahTamu: number = 1;
  tempat: string = '';

  waktuList = ['11.00', '12.00', '13.00', '14:00', '15:00', '16:00'];
  tempatList = ['INDOR', 'OUTDOOR', 'VVIP'];
  showDateModal = false;

  openDate() {
    this.showDateModal = true;
  }
  
  setTanggal(event: any) {
    this.tanggal = event.detail.value;
    this.showDateModal = false;
  }
  constructor(private router: Router) {}
  konfirmasi() {
    this.router.navigate(['/menu']);
    console.log({
      tanggal: this.tanggal,
      waktu: this.waktu,
      jumlahTamu: this.jumlahTamu,
      tempat: this.tempat,
      
    });
  }
}