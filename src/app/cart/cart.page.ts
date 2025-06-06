// cart.page.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { PaymentService } from 'src/app/services/payment.service'; // Pastikan path ini benar

// Deklarasikan variabel global 'snap' dari Midtrans agar TypeScript tidak error
declare var snap: any;

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false, // Memastikan komponen ini non-standalone
})
export class CartPage implements OnInit {
  // --- DEKLARASI PROPERTY YANG DIBUTUHKAN OLEH HTML ---
  cart: any[] = [];
  serviceFee: number = 9000;
  paymentMethod: string = '';
  paymentMethodGroup: string = 'qris';
  showQrisOptions: boolean = false;
  reservasi: any = {};

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

  ngOnInit() {
    // Lifecycle hook, bisa dikosongkan jika tidak ada inisialisasi khusus
  }

  // --- SEMUA FUNGSI DAN GETTER YANG DIPANGGIL DARI HTML ---

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/img/default-food.png';
    }
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    return 'http://localhost:8000' + imageUrl; // Pastikan URL backend benar
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
      message: `Yakin ingin menghapus ${this.cart[index].name || this.cart[index].nama} dari pesanan?`,
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

  toggleQrisOptions() {
    this.showQrisOptions = !this.showQrisOptions;
    this.paymentMethodGroup = 'qris';
  }

  selectPayment(method: string) {
    this.paymentMethod = method;
    this.paymentMethodGroup = 'qris';
    this.showQrisOptions = false;
  }

  // --- FUNGSI UTAMA UNTUK CHECKOUT KE MIDTRANS ---

  async checkout() {
    // Validasi dasar di frontend
    if (this.cart.length === 0) {
      this.presentAlert('Keranjang Kosong', 'Silakan pilih menu terlebih dahulu.');
      return;
    }
    if (!this.reservasi || !this.reservasi.id) {
      this.presentAlert('Error', 'ID Reservasi tidak ditemukan. Silakan ulangi proses reservasi.');
      this.router.navigate(['/reservation']);
      return;
    }
    if (!this.paymentMethod) {
       this.presentAlert('Peringatan', 'Silakan pilih metode pembayaran terlebih dahulu.');
       return;
    }

    // 1. Siapkan payload untuk dikirim ke backend Laravel.
    const payload = {
      reservasi_id: this.reservasi.id,
      service_fee: this.serviceFee,
      cart: this.cart.map(item => ({
        id: item.id,
        quantity: item.quantity,
        note: item.note || ''
      }))
    };

    console.log('Sending payload to backend:', payload);

    // 2. Panggil service untuk memproses checkout di backend
    this.paymentService.processCheckout(payload).subscribe({
      next: (response) => {
        // 3. Jika berhasil, backend akan mengembalikan snap_token
        console.log('Backend response:', response);
        if (response && response.snap_token) {
          // 4. Buka popup pembayaran Midtrans menggunakan snap_token
          snap.pay(response.snap_token, {
            onSuccess: (result: any) => {
              console.log('Payment Success:', result);
              this.presentAlert('Pembayaran Berhasil', 'Pembayaran DP Anda telah diterima. Reservasi Anda telah dikonfirmasi.');
              this.router.navigate(['/riwayat-transaksi']);
            },
            onPending: (result: any) => {
              console.log('Payment Pending:', result);
              this.presentAlert('Pembayaran Tertunda', 'Selesaikan pembayaran Anda sebelum batas waktu yang ditentukan.');
              this.router.navigate(['/riwayat-transaksi']);
            },
            onError: (error: any) => {
              console.error('Payment Error:', error);
              this.presentAlert('Pembayaran Gagal', 'Terjadi kesalahan saat memproses pembayaran.');
            },
            onClose: () => {
              console.log('Payment popup closed without finishing payment');
              this.presentAlert('Info', 'Anda menutup jendela pembayaran sebelum selesai.');
            }
          });
        } else {
          this.presentAlert('Error', 'Gagal mendapatkan token pembayaran dari server.');
        }
      },
      error: (error) => {
        // 5. Tangani jika terjadi error saat memanggil API backend
        console.error('API Error:', error);
        const errorMsg = error.error?.message || 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
        this.presentAlert('Checkout Gagal', errorMsg);
      }
    });
  }

  // --- FUNGSI BANTUAN ---

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