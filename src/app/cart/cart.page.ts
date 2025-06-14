import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { PaymentService } from 'src/app/services/payment.service';
import { ReservationService } from 'src/app/services/reservation.service';

declare var snap: any;

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false,
})
export class CartPage implements OnInit {
  cart: any[] = [];
  reservasi: any = {};

  paymentMethod = '';
  paymentMethodGroup = '';
  openPaymentGroup = '';

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
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
    }
  }

  ngOnInit() {}

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

  // >>>>>>>>>>>>>> START OF NEW CODE <<<<<<<<<<<<<<
  get serviceFee(): number {
    return this.paymentAmount * 0.10; // 10% dari DP 50%
  }

  get remainingBill(): number { 
    return this.total - this.paymentAmount + this.serviceFee; 
  }
  // >>>>>>>>>>>>>> END OF NEW CODE <<<<<<<<<<<<<<

  async checkout() {
    if (!this.cart.length) return this.presentAlert('Keranjang Kosong', 'Silakan pilih menu terlebih dahulu');
    if (!this.reservasi.id) { 
      this.presentAlert('Error', 'Reservasi tidak ditemukan'); 
      this.router.navigate(['/reservation']); 
      return; 
    }
    if (!this.paymentMethod) return this.presentAlert('Peringatan', 'Silakan pilih metode pembayaran');

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

    const loading = await this.loadingController.create({ message: 'Memproses checkout...' });
    await loading.present();

    this.paymentService.processCheckout(payload).subscribe({
      next: async resp => {
        await loading.dismiss();
        
        // Simpan data pesanan ke localStorage untuk riwayat
        await this.saveToHistory(resp);
        
        if (resp.snap_token) {
          snap.pay(resp.snap_token, {
            onSuccess: (result: any) => {
              this.updateOrderStatus('Selesai');
              this.router.navigate(['/invoice-detail', this.reservasi.id]);
            },
            onPending: (result: any) => {
              this.updateOrderStatus('Belum Lunas');
              this.router.navigate(['/invoice-detail', this.reservasi.id]);
            },
            onError: (result: any) => {
              this.updateOrderStatus('Pesanan Dibatalkan');
              this.presentAlert('Pembayaran Gagal', 'Terjadi kesalahan saat memproses pembayaran');
            },
            onClose: () => {
              this.presentAlert('Info', 'Anda menutup jendela pembayaran');
            }
          });
        } else {
          this.presentAlert('Error', 'Token pembayaran tidak tersedia');
        }
      },
      error: async err => {
        await loading.dismiss();
        this.presentAlert('Checkout Gagal', err.error?.message || 'Tidak dapat terhubung ke server');
      }
    });
  }

  private async saveToHistory(checkoutResponse: any) {
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
      status: 'Belum Lunas', // Default status, akan diupdate berdasarkan payment
      payment_method: this.paymentMethod,
      reservasi_data: {
        waktu_kedatangan: this.reservasi.waktu_kedatangan,
        jumlah_tamu: this.reservasi.jumlah_tamu,
        meja: this.reservasi.meja || [],
        kode_reservasi: this.reservasi.kode_reservasi
      },
      checkout_response: checkoutResponse
    };

    // Ambil riwayat yang sudah ada
    const existingHistory = JSON.parse(localStorage.getItem('riwayat') || '[]');
    
    // Cek apakah sudah ada order dengan ID yang sama
    const existingIndex = existingHistory.findIndex((item: any) => item.id === orderData.id);
    
    if (existingIndex > -1) {
      // Update data yang sudah ada
      existingHistory[existingIndex] = orderData;
    } else {
      // Tambah data baru
      existingHistory.unshift(orderData);
    }

    // Simpan kembali ke localStorage
    localStorage.setItem('riwayat', JSON.stringify(existingHistory));
    
    console.log('Order saved to history:', orderData);
  }

  private updateOrderStatus(status: string) {
    const existingHistory = JSON.parse(localStorage.getItem('riwayat') || '[]');
    const orderIndex = existingHistory.findIndex((item: any) => item.id === this.reservasi.id);
    
    if (orderIndex > -1) {
      existingHistory[orderIndex].status = status;
      existingHistory[orderIndex].updated_at = new Date().toLocaleString('id-ID');
      localStorage.setItem('riwayat', JSON.stringify(existingHistory));
      
      console.log('Order status updated to:', status);
    }
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  goBack() { 
    this.router.navigate(['/menu']); 
  }
}