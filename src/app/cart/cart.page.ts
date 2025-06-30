import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { PaymentService } from 'src/app/services/payment.service';
import { ReservationService } from 'src/app/services/reservation.service';
import { AuthService } from 'src/app/auth.service';

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
  checkoutStarted = false;
  remainingSeconds = 0;
  countdownInterval: any;

  // Untuk menyimpan token dan opsi Midtrans
  snapToken: string | null = null;
  snapOptions: any = null;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private paymentService: PaymentService,
    private reservationService: ReservationService, // Service sudah di-inject
    private authService: AuthService
  ) {
    // [PERBAIKAN]: Logika pengambilan data reservasi
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state;
    // Prioritas 1: Ambil dari service
    if (this.reservationService.activeReservation) {
      this.reservasi = this.reservationService.activeReservation;
      console.log('Reservasi diambil dari Service:', this.reservasi);
    } 
    // Prioritas 2: Ambil dari navigation state (sebagai fallback)
    else if (state?.['reservasi']) {
      this.reservasi = state['reservasi'];
      this.reservationService.activeReservation = this.reservasi; // Simpan juga ke service
      console.log('Reservasi diambil dari Navigation State:', this.reservasi);
    }
    // Ambil data keranjang dari state (jika ada)
    if (state?.['cart']) {
      this.cart = state['cart'].map((i: any) => ({ ...i, quantity: i.quantity || 1, note: i.note || '' }));
    }
    
    // Jika setelah semua cara tetap tidak ada ID, navigasikan kembali
    if (!this.reservasi?.id) {
      console.error('FATAL: Tidak ada ID Reservasi. Kembali ke jadwal.');
      this.presentAlert('Sesi reservasi tidak ditemukan, silakan ulangi.', 'Error');
      this.router.navigate(['/reservasi-jadwal']);
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
    // Reset token saat komponen dihancurkan
    this.snapToken = null;
    this.snapOptions = null;
  }

  ionViewWillLeave() {
    if (!this.checkoutStarted && this.reservasi?.id && this.reservasi.status === 'pending_payment') {
      console.log('[CartPage] ionViewWillLeave: membatalkan reservasi karena kembali sebelum checkout');
      this.cancelReservation(this.reservasi.id);
    }
  }

  startAutoCancelTimeout() {
    if (!this.reservasi?.id) return;
    this.clearAutoCancelTimeout();
    this.autoCancelTimeout = setTimeout(() => {
      this.cancelReservation(this.reservasi.id);
    }, 5 * 60 * 1000);
  }

  clearAutoCancelTimeout() {
    if (this.autoCancelTimeout) {
      clearTimeout(this.autoCancelTimeout);
      this.autoCancelTimeout = null;
    }
  }

  startCountdown() {
    this.clearCountdown();
    this.remainingSeconds = 5 * 60;
    this.countdownInterval = setInterval(() => {
      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) {
        this.clearCountdown();
        this.cancelReservation(this.reservasi.id);
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

  formatVaNumber(vaNumber: string): string {
    if (!vaNumber) return '';
    const cleaned = vaNumber.replace(/\D/g, '');
    return cleaned.match(/.{1,4}/g)?.join(' ') || vaNumber;
  }

  async cancelReservation(reservasiId: number) {
    const loading = await this.loadingController.create({ message: 'Membatalkan reservasi...' });
    await loading.present();
    try {
      const response = await this.reservationService.autoCancelReservasi(reservasiId).toPromise();
      await this.showToast(response?.message || 'Reservasi dibatalkan.', 'warning');
      this.router.navigate(['/reservasi-jadwal']);
    } catch (error: any) {
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

  /**
   * Method central untuk membuka Midtrans Pay popup
   */
  openSnapPay() {
    if (!this.snapToken || !this.snapOptions) {
      console.error('Token atau opsi Snap tidak tersedia');
      return;
    }

    // Tutup popup sebelumnya jika ada
    if (typeof snap !== 'undefined' && snap.close) {
      snap.close();
    }

    // Pastikan snap terdefinisi
    if (typeof snap !== 'undefined') {
      snap.pay(this.snapToken, this.snapOptions);
    } else {
      console.error('Snap.js tidak terdefinisi');
      this.presentAlert('Error', 'Sistem pembayaran tidak tersedia. Silakan coba lagi.');
    }
  }

  /**
   * Handler untuk status pending: tampilkan alert dengan opsi re-open popup
   */
  private async handlePending(result: any) {
    this.updateOrderStatus('Belum Lunas');
    this.startAutoCancelTimeout();
    this.startCountdown();

    // Perbaikan: Ambil VA Number dari berbagai tipe bank
    const va = result.va_numbers?.[0]?.va_number || result.permata_va_number || '';
    
    const alert = await this.alertController.create({
      header: 'Menunggu Pembayaran',
      message:  `
        Silakan selesaikan pembayaran: 
        ${this.formatVaNumber(va)}`,
      buttons: [{
        text: 'Buka Kembali Pembayaran',
        handler: () => this.openSnapPay()
      }]
    });
    await alert.present();
  }

  async checkout() {
    if (!this.cart.length) return this.presentAlert('Keranjang Kosong', 'Silakan pilih menu terlebih dahulu');
    if (!this.reservasi.id) return this.presentAlert('Error', 'Reservasi tidak ditemukan');
    if (!this.paymentMethod) return this.presentAlert('Peringatan', 'Silakan pilih metode pembayaran');

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

    const loading = await this.loadingController.create({ 
      message: 'Memproses checkout...',
      spinner: 'crescent'
    });
    await loading.present();

    this.paymentService.processCheckout(payload).subscribe({
      next: async (resp: any) => {
        await loading.dismiss();
        console.log('[DEBUG] Snap Token:', resp.snap_token);

        this.saveToHistory(resp);
        
        if (resp.snap_token) {
          // Simpan token & opsi
          this.snapToken = resp.snap_token;
          this.snapOptions = {
            onSuccess: (result: any) => {
              console.log('[CartPage] Pembayaran sukses:', result);
              // Reset token setelah transaksi berhasil
              this.snapToken = null;
              this.snapOptions = null;
              this.presentAlert('Pembayaran Berhasil', 'Pembayaran Anda telah kami terima.');
              this.router.navigate(['/invoice-detail', this.reservasi.id]);
            },
            onPending: (result: any) => this.handlePending(result),
            onError: (err: any) => {
              console.error('[CartPage] Error pembayaran:', err);
              this.presentAlert(
                'Pembayaran Gagal', 
                `Terjadi kesalahan: ${err?.message || 'Silakan coba metode pembayaran lain'}`
              );
              this.updateOrderStatus('Pesanan Dibatalkan');
              this.startAutoCancelTimeout();
            },
            onClose: () => {
              console.log('[CartPage] Pengguna menutup jendela pembayaran');
              this.clearCountdown();
              this.startAutoCancelTimeout();
              this.startCountdown();
              this.presentAlert(
                'Info',
                `Anda menutup jendela pembayaran. Silakan selesaikan pembayaran dalam ${this.formatTime(this.remainingSeconds)}`
              );
            }
          };
          
          // Tampilkan Midtrans popup
          setTimeout(() => this.openSnapPay(), 500);
        } else {
          this.presentAlert('Error', 'Token pembayaran tidak tersedia');
          this.startAutoCancelTimeout();
        }
      },
      error: async err => {
        await loading.dismiss();
        console.error('[CartPage] Checkout error:', err);
        this.presentAlert('Checkout Gagal', err.error?.message || 'Tidak dapat terhubung ke server');
        this.startAutoCancelTimeout();
      }
    });
  }

  private async saveToHistory(checkoutResponse: any) {
    try {
      const historyEntry = {
        id: this.reservasi.id,
        invoice_number: checkoutResponse.invoice_number || `INV-${Date.now()}`,
        created_at: new Date().toISOString(),
        total: this.total,
        items: this.cart.map(item => ({
          id: item.id,
          nama: item.nama || item.name,
          harga: item.final_price || item.price || item.harga,
          quantity: item.quantity,
          note: item.note
        })),
        customer: {
          nama_pelanggan: this.reservasi.nama_pelanggan || 'Guest',
          phone: this.reservasi.phone || '',
          email: this.reservasi.email || ''
        },
        reservasi: {
          id: this.reservasi.id,
          tanggal_reservasi: this.reservasi.tanggal_reservasi,
          jam_reservasi: this.reservasi.jam_reservasi,
          jumlah_orang: this.reservasi.jumlah_orang,
          meja: this.reservasi.meja
        },
        invoice: {
          payment_status: 'pending',
          payment_method: this.paymentMethod,
          total_amount: this.total,
          generated_at: new Date().toISOString()
        }
      };

      // Dapatkan user ID
      const userId = this.authService.getCurrentUserId();
      const storageKey = `riwayat_${userId}`;

      const existingHistory = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      
      const updatedHistory = existingHistory.filter(
        (item: any) => item.id !== this.reservasi.id
      );
      
      updatedHistory.unshift(historyEntry);
      sessionStorage.setItem(storageKey, JSON.stringify(updatedHistory));
      
      console.log(`[CartPage] Riwayat disimpan untuk user ${userId}`);
    } catch (err) {
      console.error('[CartPage] Gagal menyimpan riwayat:', err);
    }
  }

  private updateOrderStatus(status: string) {
    console.log(`[CartPage] Memperbarui status pesanan menjadi: ${status}`);
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
    this.clearAutoCancelTimeout();
    this.router.navigate(['/menu'], { state: { reservasi: this.reservasi } });
  }

  private async showToast(message: string, color: string = 'primary') {
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