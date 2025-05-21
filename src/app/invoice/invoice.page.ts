import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';  // import AlertController

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.page.html',
  styleUrls: ['./invoice.page.scss'],
  standalone: false
})
export class InvoicePage implements OnInit {
  transaksi: any = null;
  transaksiHistory: any[] = [];
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
  tampilkanDetail = false;

  constructor(private router: Router, private alertCtrl: AlertController) { // inject AlertController
    const nav = this.router.getCurrentNavigation();
    this.transaksi = nav?.extras?.state?.['transaksi'];
    this.reservasi = nav?.extras?.state?.['reservasi'] || {};
    this.tampilkanDetail = !!this.transaksi;
  }

  ngOnInit() {
    if (this.transaksi) {
      this.hitungTotal();

      const transaksiLengkap = {
        ...this.transaksi,
        reservasi: this.reservasi
      };

      this.simpanTransaksi(transaksiLengkap);
    }

    this.ambilHistoriTransaksi();
  }

  hitungTotal() {
    this.subtotal = this.transaksi.items.reduce(
      (sum: number, itm: any) => sum + itm.harga * itm.quantity,
      0
    );
    this.total = this.transaksi.total;
    this.downPayment = this.transaksi.dibayar;
  }

  simpanTransaksi(trx: any) {
    const history = JSON.parse(localStorage.getItem('transactionHistory') || '[]');
    const isAlreadyStored = history.some((h: any) => h.id === trx.id);
    if (!isAlreadyStored) {
      history.unshift(trx);
      localStorage.setItem('transactionHistory', JSON.stringify(history));
    }
  }

  ambilHistoriTransaksi() {
    const history = localStorage.getItem('transactionHistory');
    if (history) {
      this.transaksiHistory = JSON.parse(history);
    }
  }

  getQrCodeData(id: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=INV-${id}`;
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  lihatDetailInvoice(trx: any) {
    this.router.navigate(['/invoice-detail'], {
      state: {
        transaksi: trx,
        reservasi: trx.reservasi || {}
      }
    });
  }

  async hapusInvoice(id: string) {
    const alert = await this.alertCtrl.create({
      header: 'Konfirmasi',
      message: 'Apakah Anda yakin ingin menghapus invoice ini?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: () => {
            this.transaksiHistory = this.transaksiHistory.filter(trx => trx.id !== id);
            localStorage.setItem('transactionHistory', JSON.stringify(this.transaksiHistory));
          }
        }
      ]
    });

    await alert.present();
  }
}
