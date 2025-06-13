import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ReservationService } from '../services/reservation.service';
import { InvoiceService } from '../services/invoice.service'; // Import InvoiceService

@Component({
  selector: 'app-detail-pesanan',
  templateUrl: './detail-pesanan.page.html',
  styleUrls: ['./detail-pesanan.page.scss'],
  standalone: false
})
export class DetailPesananPage implements OnInit {
  pesanan: any = null;
  invoiceData: any = null; // Tambah property untuk invoice data
  isLoading = false;

  constructor(
    private router: Router, 
    private alertController: AlertController,
    private loadingController: LoadingController,
    private reservationService: ReservationService,
    private invoiceService: InvoiceService // Inject InvoiceService
  ) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['pesanan']) {
      this.pesanan = nav.extras.state['pesanan'];
      console.log('Data pesanan diterima:', this.pesanan);
    } else {
      // Jika tidak ada data dari navigasi, kembali ke riwayat
      this.router.navigate(['/tabs/riwayat']);
    }
  }

  async ngOnInit() {
    // Jika pesanan ada dan punya ID, load detail lengkap dari server
    if (this.pesanan?.id) {
      await this.loadDetailPesanan(this.pesanan.id);
      await this.loadInvoiceData(this.pesanan.id); // Load invoice data untuk mendapatkan items
    }
  }

  private async loadDetailPesanan(reservasiId: number) {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Memuat detail pesanan...'
    });
    await loading.present();

    this.reservationService.getReservationDetail(reservasiId).subscribe({
      next: (response) => {
        console.log('Detail reservasi dari server:', response);
        
        if (response.reservasi) {
          // Update pesanan dengan data lengkap dari server
          this.pesanan = {
            id: response.reservasi.id,
            tanggal: new Date(response.reservasi.created_at).toLocaleString('id-ID'),
            waktu_kedatangan: response.reservasi.waktu_kedatangan,
            kode_reservasi: response.reservasi.kode_reservasi,
            jumlah_tamu: response.reservasi.jumlah_tamu,
            status: this.getStatusLabel(response.reservasi.status, response.reservasi.payment_status),
            total: response.reservasi.total_bill || 0,
            metode: response.reservasi.payment_method || 'Belum dipilih',
            meja: response.reservasi.meja || [],
            catatan: response.reservasi.catatan,
            // Hapus mapping items di sini karena akan diambil dari invoice data
            raw_data: response.reservasi
          };
          
          console.log('Pesanan setelah update:', this.pesanan);
        }
      },
      error: (error) => {
        console.error('Error loading detail pesanan:', error);
        this.presentAlert('Error', 'Gagal memuat detail pesanan');
      },
      complete: () => {
        this.isLoading = false;
        loading.dismiss();
      }
    });
  }

  // Tambah method untuk load invoice data (sama seperti di invoice-detail.page.ts)
  private async loadInvoiceData(reservasiId: number) {
    try {
      this.invoiceService.getInvoiceData(reservasiId.toString()).subscribe({
        next: (data) => {
          this.invoiceData = data;
          console.log('Invoice data loaded:', this.invoiceData);
          
          // Update total dari invoice data jika ada
          if (this.invoiceData?.invoice?.total_amount) {
            this.pesanan.total = this.invoiceData.invoice.total_amount;
          }
        },
        error: (error) => {
          console.error('Error loading invoice data:', error);
          // Tidak perlu alert karena ini optional
        }
      });
    } catch (error) {
      console.error('Error in loadInvoiceData:', error);
    }
  }

  // Getter untuk items (sama seperti di invoice-detail.page.ts)
  get items() {
    return this.invoiceData?.items || [];
  }

  // Getter untuk invoice
  get invoice() {
    return this.invoiceData?.invoice || {};
  }

  // Getter untuk reservasi dari invoice data
  get reservasi() {
    return this.invoiceData?.reservasi || {};
  }

  // Getter untuk customer
  get customer() {
    return this.invoiceData?.customer || {};
  }

  private getStatusLabel(status: string, paymentStatus?: string): string {
    switch (status) {
      case 'selesai':
        return 'Selesai';
      case 'dibatalkan':
        return 'Pesanan Dibatalkan';
      case 'pending_payment':
        return 'Belum Dibayar';
      case 'confirmed':
        return paymentStatus === 'paid' ? 'Dikonfirmasi' : 'Belum Lunas';
      case 'active_order':
        return 'Sedang Berlangsung';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  async cancelOrder() {
    const alert = await this.alertController.create({
      header: 'Konfirmasi Pembatalan',
      message: 'Apakah Anda yakin ingin membatalkan pesanan ini? Jika anda batalkan uang anda tidak akan kembali',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Ya, Batalkan',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Membatalkan Pesanan...'
            });
            await loading.present();

            this.reservationService.cancelReservation(this.pesanan.id).subscribe({
              next: (response) => {
                console.log('Pembatalan berhasil:', response);
                this.pesanan.status = 'Pesanan Dibatalkan';
                this.presentAlert('Sukses', 'Pesanan berhasil dibatalkan');
                // Navigasi kembali ke riwayat
                this.router.navigate(['/tabs/riwayat']);
              },
              error: (error) => {
                console.error('Error membatalkan pesanan:', error);
                this.presentAlert('Error', 'Gagal membatalkan pesanan');
              },
              complete: () => {
                loading.dismiss();
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  // Method untuk logika tampil/tidaknya tombol batal
  isBisaDibatalkan(): boolean {
    if (!this.pesanan) return false;
    
    const status = this.pesanan.status?.toLowerCase().trim();
    // Bisa dibatalkan jika statusnya belum lunas atau belum dibayar
    return status === 'belum lunas' || status === 'belum dibayar' || status === 'pending_payment';
  }

  private async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({ 
      header, 
      message, 
      buttons: ['OK'] 
    });
    await alert.present();
  }

  // Helper method untuk format currency
  formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return 'Rp 0';
    
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Method untuk mendapatkan warna status
  getStatusColor(status: string): string {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'selesai':
      case 'dikonfirmasi':
        return 'success';
      case 'pesanan dibatalkan':
      case 'dibatalkan':
        return 'danger';
      case 'belum lunas':
      case 'belum dibayar':
      case 'pending_payment':
        return 'warning';
      case 'sedang berlangsung':
        return 'primary';
      default:
        return 'medium';
    }
  }

  // Method untuk lanjutkan pembayaran
  lanjutkanPembayaran() {
    if (this.pesanan?.id) {
      this.router.navigate(['/invoice-detail', this.pesanan.id]);
    }
  }

  // Method untuk navigasi kembali
  goBack() {
    this.router.navigate(['/tabs/riwayat']);
  }
}