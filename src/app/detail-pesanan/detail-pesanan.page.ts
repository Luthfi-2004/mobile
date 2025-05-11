import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-detail-pesanan',
  templateUrl: './detail-pesanan.page.html',
  styleUrls: ['./detail-pesanan.page.scss'],
  standalone: false
})
export class DetailPesananPage {
  pesanan: any;

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['pesanan']) {
      this.pesanan = nav.extras.state['pesanan'];
    } else {
      // Jika tidak ada data, kembali ke riwayat
      this.router.navigate(['/riwayat']);
    }
  }
}
