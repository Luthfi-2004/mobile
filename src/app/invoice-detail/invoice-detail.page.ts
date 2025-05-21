import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-invoice-detail',
  templateUrl: './invoice-detail.page.html',
  styleUrls: ['./invoice-detail.page.scss'],
  standalone: false
})
export class InvoiceDetailPage implements OnInit {
  transaksi: any;
  reservasi: any;
  subtotal = 0;
  serviceFee = 9000;
  total = 0;
  downPayment = 0;

  pelanggan = {
    nama: 'Budiono',
    email: 'Budiono@gmail.com',
    telp: '08123456789'
  };

  constructor(private route: ActivatedRoute, private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.transaksi = nav?.extras?.state?.['transaksi'];
    this.reservasi = nav?.extras?.state?.['reservasi'] || {};
  }

  ngOnInit() {
    if (this.transaksi) {
      this.hitungTotal();
    }
  }

  hitungTotal() {
    this.subtotal = this.transaksi.items.reduce(
      (sum: number, itm: any) => sum + itm.harga * itm.quantity,
      0
    );
    this.total = this.transaksi.total;
    this.downPayment = this.transaksi.dibayar;
  }

  getQrCodeData(id: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-${id}`;
  }
}
