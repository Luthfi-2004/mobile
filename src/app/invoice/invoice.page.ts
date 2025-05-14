import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.page.html',
  styleUrls: ['./invoice.page.scss'],
  standalone: false
})
export class InvoicePage {
  transaksi: any;
  subtotal = 0;
  serviceFee = 9000;
  total = 0;
  downPayment = 0;

  pelanggan = {
    nama: 'Budiono',
    email: 'Budiono@gmail.com',
    telp: '08123456789'
  };

  reservasi: any = {};

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.transaksi = nav?.extras?.state?.['transaksi'];
    this.reservasi = nav?.extras?.state?.['reservasi'] || {};

    if (this.transaksi) {
      this.subtotal = this.transaksi.items.reduce(
        (total: number, item: any) => total + item.harga * item.quantity,
        0
      );
      this.total = this.transaksi.total;
      this.downPayment = this.transaksi.dibayar;
    }

    // Simpan transaksi ke localStorage agar bisa diambil oleh notifikasi
    if (this.transaksi) {
      localStorage.setItem('lastTransaction', JSON.stringify(this.transaksi));
    }
  }

  getQrCodeData(): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-${this.transaksi?.id}`;
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }
}
