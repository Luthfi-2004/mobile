import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { PaymentService } from 'src/app/services/payment.service';
import { ReservationService } from 'src/app/services/reservation.service';

declare var snap: any;

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false,
})
export class CartPage implements OnInit, OnDestroy {
  cart: any[] = [];
  reservasi: any = {};

  paymentMethod = '';
  paymentMethodGroup = '';
  openPaymentGroup = '';

  autoCancelTimeout: any;
  private checkoutStarted = false;

  // untuk hitung mundur tampilan log
  private remainingSeconds = 0;
  private countdownInterval: any;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private paymentService: PaymentService,
    private reservationService: ReservationService
  ) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.cart = (nav.extras.state['cart'] || []).map((i: any) => ({
        ...i,
        quantity: i.quantity || 1,
        note: i.note || ''
      }));
      this.reservasi = nav.extras.state['reservasi'] || {};
      console.log('[CartPage] Reservasi ID diterima:', this.reservasi.id);
    } else {
      console.warn('[CartPage] Tidak ada data reservasi yang diterima');
    }
  }

  ngOnInit() {
    console.log('[CartPage] Halaman diinisialisasi, memulai timeout pembatalan');
    this.startAutoCancelTimeout();
  }

  ngOnDestroy() {
    console.log('[CartPage] Halaman dihancurkan, membersihkan timeout dan countdown');
    this.clearAutoCancelTimeout();
    this.clearCountdown();
  }

  ionViewWillLeave() {
    if (!this.checkoutStarted && this.reservasi?.id && this.reservasi.status === 'pending_payment') {
      console.log('[CartPage] ionViewWillLeave: membatalkan reservasi karena kembali sebelum checkout');
      this.cancelReservation(this.reservasi.id);
    }
  }

  startAutoCancelTimeout() {
    if (!this.reservasi?.id) {
      console.warn('[CartPage] Tidak dapat memulai timeout: Reservasi ID tidak ditemukan');
      return;
    }
    this.clearAutoCancelTimeout();
    console.log(`[CartPage] Memulai timeout pembatalan untuk reservasi ${this.reservasi.id}`);
    this.autoCancelTimeout = setTimeout(() => {
      console.log('[CartPage] ⏰ Timeout pembatalan tercapai! Membatalkan reservasi...');
      this.cancelReservation(this.reservasi.id);
    }, 5 * 60 * 1000);
  }

  clearAutoCancelTimeout() {
    if (this.autoCancelTimeout) {
      console.log('[CartPage] Membersihkan timeout pembatalan');
      clearTimeout(this.autoCancelTimeout);
      this.autoCancelTimeout = null;
    }
  }

  // memulai countdown log setelah tutup payment window
  startCountdown() {
    this.clearCountdown();
    this.remainingSeconds = 5 * 60;
    console.log(`[CartPage] Hitung mundur pembatalan dimulai: ${this.formatTime(this.remainingSeconds)}`);
    this.countdownInterval = setInterval(() => {
      this.remainingSeconds--;
      console.log(`[CartPage] Waktu tersisa sebelum auto-cancel: ${this.formatTime(this.remainingSeconds)}`);
      if (this.remainingSeconds <= 0) {
        this.clearCountdown();
      }
    }, 1000);
  }

  clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  async cancelReservation(reservasiId: number) {
    console.log(`[CartPage] Memulai pembatalan otomatis untuk reservasi ${reservasiId}`);
    const loading = await this.loadingController.create({ message: 'Membatalkan reservasi...', spinner: 'crescent' });
    await loading.present();
    try {
      const response = await this.reservationService.autoCancelReservasi(reservasiId).toPromise();
      const message = response?.message || 'Reservasi dibatalkan.';
      console.log(`[CartPage] Berhasil membatalkan reservasi: ${message}`);
      await this.showToast(message, 'warning');
      this.router.navigate(['/reservasi-jadwal']);
    } catch (error: any) {
      console.error('[CartPage] Gagal membatalkan reservasi otomatis:', error);
      await this.showToast(error?.error?.message || 'Gagal membatalkan reservasi.', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  getImageUrl(imageUrl?: string): string {
    if (!imageUrl) return 'assets/img/default-food.png';
    return imageUrl.startsWith('http') ? imageUrl : 'http://localhost:8000' + imageUrl;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/img/default-food.png';
  }

  decreaseQty(i: number) {
    if (this.cart[i].quantity > 1) this.cart[i].quantity--;
  }

  increaseQty(i: number) {
    this.cart[i].quantity++;
  }

  deleteItem(i: number) {
    this.cart.splice(i, 1);
    if (!this.cart.length) this.router.navigate(['/menu']);
  }

  togglePaymentGroup(group: string) {
    this.openPaymentGroup = this.openPaymentGroup === group ? '' : group;
    this.paymentMethodGroup = this.openPaymentGroup ? group : '';
  }

  selectPayment(method: string, group: string) {
    this.paymentMethod = method;
    this.paymentMethodGroup = group;
  }

  get subtotal(): number {
    return this.cart.reduce((sum, i) => sum + ((i.final_price || i.price || i.harga) * i.quantity), 0);
  }

  get total(): number {
    return this.subtotal;
  }

  get paymentAmount(): number {
    return this.total * 0.5;
  }

  get serviceFee(): number {
    return this.paymentAmount * 0.10;
  }

  get remainingBill(): number {
    return this.total - this.paymentAmount + this.serviceFee;
  }

  async checkout() {
    console.log('[CartPage] Memulai proses checkout');

    if (!this.cart.length) {
      console.warn('[CartPage] Checkout gagal: Keranjang kosong');
      return this.presentAlert('Keranjang Kosong', 'Silakan pilih menu terlebih dahulu');
    }

    if (!this.reservasi.id) {
      console.error('[CartPage] Checkout gagal: Reservasi tidak ditemukan');
      this.presentAlert('Error', 'Reservasi tidak ditemukan');
      this.router.navigate(['/reservation']);
      return;
    }

    if (!this.paymentMethod) {
      console.warn('[CartPage] Checkout gagal: Metode pembayaran belum dipilih');
      return this.presentAlert('Peringatan', 'Silakan pilih metode pembayaran');
    }

    console.log('[CartPage] Membersihkan timeout sebelum checkout');
    this.clearAutoCancelTimeout();

    this.checkoutStarted = true;

    const payload = {
      reservasi_id: this.reservasi.id,
      payment_method: this.paymentMethod,
      cart: this.cart.map(i => ({
        id: i.id,
        quantity: i.quantity,
        note: i.note,
        nama: i.nama || i.name,
        harga: i.final_price || i.price || i.harga
      }))
    };

    console.log('[CartPage] Checkout payload:', payload);

    const loading = await this.loadingController.create({ message: 'Memproses checkout...' });
    await loading.present();

    this.paymentService.processCheckout(payload).subscribe({
      next: async resp => {
        console.log('[CartPage] Respons checkout:', resp);
        await loading.dismiss();
        await this.saveToHistory(resp);
        if (resp.snap_token) {
          console.log('[CartPage] Token pembayaran diterima, membuka gateway pembayaran');
          snap.pay(resp.snap_token, {
            onSuccess: (result: any) => {
              console.log('[CartPage] Pembayaran sukses:', result);
              this.updateOrderStatus('Selesai');
              this.router.navigate(['/invoice-detail', this.reservasi.id]);
            },
            onPending: (result: any) => {
              console.log('[CartPage] Pembayaran pending:', result);
              this.updateOrderStatus('Belum Lunas');
              this.router.navigate(['/invoice-detail', this.reservasi.id]);
            },
            onError: (result: any) => {
              console.error('[CartPage] Error pembayaran:', result);
              this.updateOrderStatus('Pesanan Dibatalkan');
              this.presentAlert('Pembayaran Gagal', 'Terjadi kesalahan saat memproses pembayaran');
              console.log('[CartPage] Memulai ulang timeout setelah error pembayaran');
              this.startAutoCancelTimeout();
            },
            onClose: () => {
              console.log('[CartPage] Pengguna menutup jendela pembayaran');
              // reset flag agar back akan membatalkan
              this.checkoutStarted = false;
              this.clearCountdown();
              this.startAutoCancelTimeout();
              this.startCountdown();
              this.presentAlert('Info', `Anda menutup jendela pembayaran, Pembatalan otomatis dalam ${this.formatTime(this.remainingSeconds)}. (tekan back untuk langsung batalkan.)`);
            }
          });
        } else {
          console.error('[CartPage] Token pembayaran tidak tersedia');
          this.presentAlert('Error', 'Token pembayaran tidak tersedia');
          console.log('[CartPage] Memulai ulang timeout setelah gagal mendapatkan token');
          this.startAutoCancelTimeout();
        }
      },
      error: async err => {
        console.error('[CartPage] Error checkout:', err);
        await loading.dismiss();
        this.presentAlert('Checkout Gagal', err.error?.message || 'Tidak dapat terhubung ke server');
        console.log('[CartPage] Memulai ulang timeout setelah error checkout');
        this.startAutoCancelTimeout();
      }
    });
  }

  private async saveToHistory(checkoutResponse: any) {
    console.log('[CartPage] Menyimpan pesanan ke riwayat');
    // ... existing saveToHistory remains ...
  }

  private updateOrderStatus(status: string) {
    console.log(`[CartPage] Memperbarui status pesanan menjadi: ${status}`);
    // ... existing updateOrderStatus remains ...
  }

  async presentAlert(header: string, message: string) {
    console.log(`[ChatGPT] Menampilkan alert: ${header} - ${message}`);
    const alert = await this.alertController.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  goBack() {
    console.log('[CartPage] Kembali ke halaman menu');
    this.clearAutoCancelTimeout();
    this.router.navigate(['/menu'], { state: { reservasi: this.reservasi } });
  }

  private async showToast(message: string, color: string = 'primary') {
    console.log(`[CartPage] Menampilkan toast: ${message}`);
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      mode: 'ios',
      cssClass: color === 'danger' ? 'toast-error' : ''
    });
    await toast.present();
  }
}
