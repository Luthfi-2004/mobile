import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-riwayat',
  templateUrl: './riwayat.page.html',
  styleUrls: ['./riwayat.page.scss'],
  standalone: false
})
export class RiwayatPage {
  riwayat: any[] = [];

  constructor(private router: Router) {}

  ionViewWillEnter() {
    this.riwayat = JSON.parse(localStorage.getItem('riwayat') || '[]').reverse();
  }

  lihatDetail(data: any) {
    this.router.navigate(['/detail-pesanan'], {
      state: { pesanan: data }
    });
  }
}
