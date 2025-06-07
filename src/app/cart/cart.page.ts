import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { PaymentService } from 'src/app/services/payment.service';

declare var snap: any;

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false, // <-- INI SOLUSINYA. Pastikan properti ini ada dan bernilai false.
})
export class CartPage implements OnInit {
  cart: any[] = [];
  serviceFee: number = 9000;
  reservasi: any = {};

  paymentMethod: string = '';
  paymentMethodGroup: string = '';
  openPaymentGroup: string = '';

  constructor(
    private router: Router,
    private alertController: AlertController,
    private paymentService: PaymentService
  ) {
    const nav = this.router.getCurrentNavigation();

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
        console.log('Reservasi ID diterima:', this.reservasi.id);
      }
    }
  }

  ngOnInit() {}

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) return 'assets/img/default-food.png';
    if (imageUrl.startsWith('http')) return imageUrl;
    return 'http://localhost:8000' + imageUrl;
  }

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

  async deleteItem(index: number) {
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: `Yakin ingin menghapus ${this.cart[index].name || this.cart[index].nama}?`,
      buttons: [
        { text: 'Batal', role: 'cancel' },
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

  togglePaymentGroup(group: string) {
    if (this.openPaymentGroup === group) {
      this.openPaymentGroup = '';
    } else {
      this.openPaymentGroup = group;
    }
  }

  selectPayment(method: string, group: string) {
    this.paymentMethod = method;
    this.paymentMethodGroup = group;
  }

  async checkout() {
    if (this.cart.length === 0) {
      this.presentAlert('Keranjang Kosong', 'Silakan pilih menu terlebih dahulu.');
      return;
    }
    if (!this.reservasi || !this.reservasi.id) {
      this.presentAlert('Error', 'ID Reservasi tidak ditemukan.');
      this.router.navigate(['/reservation']);
      return;
    }
    if (!this.paymentMethod) {
       this.presentAlert('Peringatan', 'Silakan pilih metode pembayaran.');
       return;
    }

    const payload = {
      reservasi_id: this.reservasi.id,
      service_fee: this.serviceFee,
      payment_method: this.paymentMethod,
      cart: this.cart.map(item => ({
        id: item.id,
        quantity: item.quantity,
        note: item.note || ''
      }))
    };

    this.paymentService.processCheckout(payload).subscribe({
      next: (response) => {
        if (response && response.snap_token) {
          snap.pay(response.snap_token, {
            onSuccess: (result: any) => {
              this.presentAlert('Pembayaran Berhasil', 'Reservasi Anda telah dikonfirmasi.');
              this.router.navigate(['/riwayat-transaksi']);
            },
            onPending: (result: any) => {
              this.presentAlert('Pembayaran Tertunda', 'Selesaikan pembayaran Anda.');
              this.router.navigate(['/riwayat-transaksi']);
            },
            onError: (error: any) => {
              this.presentAlert('Pembayaran Gagal', 'Terjadi kesalahan saat memproses pembayaran.');
            },
            onClose: () => {
              this.presentAlert('Info', 'Anda menutup jendela pembayaran sebelum selesai.');
            }
          });
        } else {
          this.presentAlert('Error', 'Gagal mendapatkan token pembayaran dari server.');
        }
      },
      error: (error) => {
        const errorMsg = error.error?.message || 'Tidak dapat terhubung ke server.';
        this.presentAlert('Checkout Gagal', errorMsg);
      }
    });
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goBack() {
    this.router.navigate(['/menu']);
  }
} 