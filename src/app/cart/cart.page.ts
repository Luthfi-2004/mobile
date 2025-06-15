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
    console.log('[CartPage] Halaman dihancurkan, membersihkan timeout');
    this.clearAutoCancelTimeout();
  }

  startAutoCancelTimeout() {
    if (!this.reservasi?.id) {
      console.warn('[CartPage] Tidak dapat memulai timeout: Reservasi ID tidak ditemukan');
      return;
    }
    
    this.clearAutoCancelTimeout();
    
    console.log(`[CartPage] Memulai timeout pembatalan untuk reservasi ${this.reservasi.id}`);
    console.log(`[CartPage] Reservasi akan otomatis dibatalkan dalam 5 menit jika tidak ada tindakan`);
    
    this.autoCancelTimeout = setTimeout(() => {
      console.log('[CartPage] ⏰ Timeout pembatalan tercapai! Membatalkan reservasi...');
      this.cancelReservation(this.reservasi.id);
    }, 5 * 60 * 1000); // 5 menit
  }

  clearAutoCancelTimeout() {
    if (this.autoCancelTimeout) {
      console.log('[CartPage] Membersihkan timeout pembatalan');
      clearTimeout(this.autoCancelTimeout);
      this.autoCancelTimeout = null;
    }
  }

  async cancelReservation(reservasiId: number) {
    console.log(`[CartPage] Memulai pembatalan otomatis untuk reservasi ${reservasiId}`);
    
    const loading = await this.loadingController.create({
      message: 'Membatalkan reservasi...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      console.log(`[CartPage] Mengirim permintaan pembatalan untuk reservasi ${reservasiId}`);
      const response = await this.reservationService.autoCancelReservasi(reservasiId).toPromise();
      
      const message = response?.message || 'Reservasi dibatalkan.';
      console.log(`[CartPage] Berhasil membatalkan reservasi: ${message}`, response);
      
      await this.showToast(message, 'warning');
      this.router.navigate(['/reservasi-jadwal']);
    } catch (error: any) {
      console.error('[CartPage] Gagal membatalkan reservasi otomatis:', error);
      const message = error?.error?.message || 'Terjadi kesalahan saat membatalkan reservasi.';
      await this.showToast(message, 'danger');
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
        
        // Simpan data pesanan ke localStorage untuk riwayat
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
              
              // Restart timeout jika gagal
              console.log('[CartPage] Memulai ulang timeout setelah error pembayaran');
              this.startAutoCancelTimeout();
            },
            onClose: () => {
              console.log('[CartPage] Pengguna menutup jendela pembayaran');
              // Restart timeout jika pembayaran dibatalkan
              console.log('[CartPage] Memulai ulang timeout setelah pembayaran ditutup');
              this.startAutoCancelTimeout();
              this.presentAlert('Info', 'Anda menutup jendela pembayaran');
            }
          });
        } else {
          console.error('[CartPage] Token pembayaran tidak tersedia');
          this.presentAlert('Error', 'Token pembayaran tidak tersedia');
          
          // Restart timeout jika gagal
          console.log('[CartPage] Memulai ulang timeout setelah gagal mendapatkan token');
          this.startAutoCancelTimeout();
        }
      },
      error: async err => {
        console.error('[CartPage] Error checkout:', err);
        await loading.dismiss();
        this.presentAlert('Checkout Gagal', err.error?.message || 'Tidak dapat terhubung ke server');
        
        // Restart timeout jika gagal
        console.log('[CartPage] Memulai ulang timeout setelah error checkout');
        this.startAutoCancelTimeout();
      }
    });
  }

  private async saveToHistory(checkoutResponse: any) {
    console.log('[CartPage] Menyimpan pesanan ke riwayat');
    
    const now = new Date();
    const orderData = {
      id: this.reservasi.id,
      tanggal: now.toLocaleString('id-ID'),
      items: this.cart.map(item => ({
        nama: item.nama || item.name,
        quantity: item.quantity,
        harga: item.final_price || item.price || item.harga,
        note: item.note || ''
      })),
      total: this.total,
      status: 'Belum Lunas',
      payment_method: this.paymentMethod,
      reservasi_data: {
        waktu_kedatangan: this.reservasi.waktu_kedatangan,
        jumlah_tamu: this.reservasi.jumlah_tamu,
        meja: this.reservasi.meja || [],
        kode_reservasi: this.reservasi.kode_reservasi
      },
      checkout_response: checkoutResponse
    };

    const existingHistory = JSON.parse(localStorage.getItem('riwayat') || '[]');
    const existingIndex = existingHistory.findIndex((item: any) => item.id === orderData.id);
    
    if (existingIndex > -1) {
      existingHistory[existingIndex] = orderData;
      console.log('[CartPage] Memperbarui pesanan yang sudah ada di riwayat');
    } else {
      existingHistory.unshift(orderData);
      console.log('[CartPage] Menambahkan pesanan baru ke riwayat');
    }

    localStorage.setItem('riwayat', JSON.stringify(existingHistory));
    console.log('[CartPage] Pesanan disimpan ke riwayat:', orderData);
  }

  private updateOrderStatus(status: string) {
    console.log(`[CartPage] Memperbarui status pesanan menjadi: ${status}`);
    
    const existingHistory = JSON.parse(localStorage.getItem('riwayat') || '[]');
    const orderIndex = existingHistory.findIndex((item: any) => item.id === this.reservasi.id);
    
    if (orderIndex > -1) {
      existingHistory[orderIndex].status = status;
      existingHistory[orderIndex].updated_at = new Date().toLocaleString('id-ID');
      localStorage.setItem('riwayat', JSON.stringify(existingHistory));
      console.log('[CartPage] Status pesanan berhasil diperbarui');
    } else {
      console.warn('[CartPage] Pesanan tidak ditemukan di riwayat untuk diperbarui');
    }
  }

  async presentAlert(header: string, message: string) {
    console.log(`[CartPage] Menampilkan alert: ${header} - ${message}`);
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