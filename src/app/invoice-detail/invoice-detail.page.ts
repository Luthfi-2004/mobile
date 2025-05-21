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
  reservasi: any = {};
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
    // Hitung subtotal dari items, walaupun transaksi.total sudah ada, ini untuk memastikan konsistensi
    this.subtotal = this.transaksi.items.reduce(
      (sum: number, item: any) => sum + item.harga * item.quantity,
      0
    );
    this.total = this.transaksi.total;
    this.downPayment = this.transaksi.dibayar;
  }

  // Menghasilkan URL QR Code berdasarkan ID transaksi, dapat ditampilkan di template
  getQrCodeData(id: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-${id}`;
  }

  // Mengambil idMeja dari data reservasi jika ada, jika tidak tampilkan 'Tidak tersedia'
  get idMeja(): string {
    return this.reservasi?.idMeja || 'Tidak tersedia';
  }
}
