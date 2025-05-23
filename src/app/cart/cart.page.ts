import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false
})
export class CartPage {
  cart: any[] = [];
  serviceFee: number = 9000;
  paymentMethod: string = '';
  paymentMethodGroup: string = 'qris';
  showQrisOptions: boolean = false;
  reservasi: any = {};

  constructor(private router: Router, private alertController: AlertController) {
    const nav = this.router.getCurrentNavigation();

    // Ambil data cart dan reservasi dari state navigation (dari halaman menu)
    if (nav?.extras?.state) {
      if (nav.extras.state['cart']) {
        this.cart = nav.extras.state['cart'].map((item: any) => ({
          ...item,
          quantity: item.quantity || 1,
        }));
      }

      if (nav.extras.state['reservasi']) {
        this.reservasi = nav.extras.state['reservasi'];
      }
    }
  }

  // Hitung subtotal (harga item x qty)
  get subtotal(): number {
    return this.cart.reduce((total, item) => total + item.harga * item.quantity, 0);
  }

  // Hitung total termasuk service fee
  get total(): number {
    return this.subtotal + this.serviceFee;
  }

  // Tambah qty item
  increaseQty(index: number) {
    this.cart[index].quantity += 1;
    this.updateTotals();
  }

  // Kurangi qty item jika lebih dari 1
  decreaseQty(index: number) {
    if (this.cart[index].quantity > 1) {
      this.cart[index].quantity -= 1;
      this.updateTotals();
    }
  }

  // Edit qty dengan input alert
  async editItem(index: number) {
    const alert = await this.alertController.create({
      header: `Ubah Jumlah`,
      subHeader: this.cart[index].nama,
      inputs: [
        {
          name: 'qty',
          type: 'number',
          placeholder: 'Jumlah',
          value: this.cart[index].quantity,
          min: 0
        }
      ],
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Simpan',
          handler: (data) => {
            const parsedQty = parseInt(data.qty, 10);
            if (!isNaN(parsedQty) && parsedQty >= 0) {
              if (parsedQty === 0) {
                this.cart.splice(index, 1);
              } else {
                this.cart[index].quantity = parsedQty;
              }
              this.updateTotals();
              if (this.cart.length === 0) {
                this.router.navigate(['/menu']);
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Konfirmasi hapus item dari cart
  async deleteItem(index: number) {
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: `Yakin ingin menghapus ${this.cart[index].nama} dari pesanan?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: () => {
            this.cart.splice(index, 1);
            this.updateTotals();
            if (this.cart.length === 0) {
              this.router.navigate(['/menu']);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Toggle pilihan QRIS
  toggleQrisOptions() {
    this.showQrisOptions = !this.showQrisOptions;
    this.paymentMethodGroup = 'qris';
  }

  // Pilih metode pembayaran
  selectPayment(method: string) {
    this.paymentMethod = method;
    this.paymentMethodGroup = 'qris';
    this.showQrisOptions = false; 
  }

  // Proses checkout, simpan transaksi di localStorage, lalu navigasi ke invoice
  async checkout() {
    if (!this.paymentMethod) {
      const alert = await this.alertController.create({
        header: 'Peringatan',
        message: 'Silakan pilih metode pembayaran terlebih dahulu.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (this.cart.length === 0) {
      const alert = await this.alertController.create({
        header: 'Keranjang Kosong',
        message: 'Keranjang kosong! Silakan pilih menu terlebih dahulu.',
        buttons: ['OK']
      });
      await alert.present();
      this.router.navigate(['/menu']);
      return;
    }

    const dibayar = this.total * 0.5; // contoh bayar 50%
    const sisaBayar = this.total - dibayar;

    const transaksi = {
      id: Date.now(),
      tanggal: new Date().toLocaleString(),
      items: [...this.cart],
      total: this.total,
      dibayar: dibayar,
      sisaBayar: sisaBayar,
      metode: this.paymentMethod,
      status: 'Belum Lunas',
    };

    // Simpan transaksi ke localStorage (riwayat)
    const existing = JSON.parse(localStorage.getItem('riwayat') || '[]');
    existing.push(transaksi);
    localStorage.setItem('riwayat', JSON.stringify(existing));

    // Kosongkan cart
    this.cart = [];

    // Navigasi ke halaman invoice dengan state transaksi dan reservasi (termasuk idMeja)
    this.router.navigate(['/tabs/invoice'], {
      state: {
        transaksi,
        reservasi: this.reservasi
      }
    });
  }

  updateTotals() {
    // Getter subtotal dan total sudah otomatis, tapi jika ada logic lain bisa ditambah di sini
  }

  goBack() {
    this.router.navigate(['/menu']);
  }
}
