import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { environment } from '../../environments/environment'; // Pastikan file environment ada

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

    // Ambil data cart dan reservasi dari state navigation
    if (nav?.extras?.state) {
      if (nav.extras.state['cart']) {
        this.cart = nav.extras.state['cart'].map((item: any) => ({
          ...item,
          quantity: item.quantity || 1,
          note: item.note || ''
        }));
      }

      if (nav.extras.state['reservasi']) {
        this.reservasi = nav.extras.state['reservasi'];
      }
    }
  }

  // Fungsi untuk mendapatkan URL gambar yang benar
  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/img/default-food.png'; // Gambar default jika tidak ada
    }

    // Jika URL sudah lengkap (http/https)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Jika relative path, tambahkan base URL dari environment
    return 'http://localhost:8000' + imageUrl;
  }

  // Handler ketika gambar gagal dimuat
  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = 'assets/img/default-food.png';
    }
  }

  get subtotal(): number {
    return this.cart.reduce((total, item) => {
      const price = item.final_price || item.discounted_price || item.price || item.harga;
      return total + (price * item.quantity);
    }, 0);
  }

  get total(): number {
    return this.subtotal + this.serviceFee;
  }

  increaseQty(index: number) {
    this.cart[index].quantity += 1;
  }

  decreaseQty(index: number) {
    if (this.cart[index].quantity > 1) {
      this.cart[index].quantity -= 1;
    }
  }

  async editItem(index: number) {
    const alert = await this.alertController.create({
      header: `Ubah Jumlah`,
      subHeader: this.cart[index].name || this.cart[index].nama,
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

  async deleteItem(index: number) {
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: `Yakin ingin menghapus ${this.cart[index].name || this.cart[index].nama} dari pesanan?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: () => {
            this.cart.splice(index, 1);
            if (this.cart.length === 0) {
              this.router.navigate(['/menu']);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  toggleQrisOptions() {
    this.showQrisOptions = !this.showQrisOptions;
    this.paymentMethodGroup = 'qris';
  }

  selectPayment(method: string) {
    this.paymentMethod = method;
    this.paymentMethodGroup = 'qris';
    this.showQrisOptions = false; 
  }

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

    const transaksi = {
      id: Date.now(),
      tanggal: new Date().toLocaleString(),
      items: this.cart.map(item => ({
        id: item.id,
        name: item.name || item.nama,
        quantity: item.quantity,
        price: item.final_price || item.discounted_price || item.price || item.harga,
        image_url: item.image_url,
        note: item.note || ''
      })),
      subtotal: this.subtotal,
      serviceFee: this.serviceFee,
      total: this.total,
      metode: this.paymentMethod,
      status: 'Menunggu Pembayaran',
      reservasi: this.reservasi
    };

    // Simpan transaksi ke localStorage
    const existing = JSON.parse(localStorage.getItem('riwayat') || '[]');
    existing.push(transaksi);
    localStorage.setItem('riwayat', JSON.stringify(existing));

    // Navigasi ke halaman invoice
    this.router.navigate(['/invoice'], {
      state: {
        transaksi
      }
    });
  }

  goBack() {
    this.router.navigate(['/menu']);
  }
}