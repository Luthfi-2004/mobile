import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { InvoiceService } from '../services/invoice.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-invoice-detail',
  templateUrl: './invoice-detail.page.html',
  styleUrls: ['./invoice-detail.page.scss'],
  standalone: false
})
export class InvoiceDetailPage implements OnInit, OnDestroy {
  invoiceData: any = null;
  reservasiId: string | null = null;
  isLoading = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.reservasiId = this.route.snapshot.paramMap.get('reservasiId');
    if (!this.reservasiId) {
      this.showAlert('Error', 'ID Reservasi tidak ditemukan');
      this.router.navigate(['/tabs/home']);
      return;
    }
    this.loadInvoiceData();
  }

  ngOnDestroy() {
    // Cleanup subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async loadInvoiceData() {
    const loading = await this.loadingController.create({ 
      message: 'Memuat invoice...',
      spinner: 'dots'
    });
    await loading.present();

    try {
      this.isLoading = true;
      
      const subscription = this.invoiceService.getInvoiceData(this.reservasiId!)
        .subscribe({
          next: (data) => {
            this.invoiceData = data;
            console.log('Invoice data loaded:', data);
            
            // Generate QR Code jika belum ada
            if (!this.hasQRCode) {
              this.generateQRCode();
            }
          },
          error: async (error) => {
            console.error('Load invoice error:', error);
            await this.showAlert('Gagal', error.message || 'Terjadi kesalahan saat memuat invoice');
            this.router.navigate(['/tabs/home']);
          },
          complete: async () => {
            this.isLoading = false;
            await loading.dismiss();
          }
        });

      this.subscriptions.push(subscription);
      
    } catch (err: any) {
      console.error('Unexpected error:', err);
      this.isLoading = false;
      await loading.dismiss();
      await this.showAlert('Error', 'Terjadi kesalahan yang tidak terduga');
      this.router.navigate(['/tabs/home']);
    }
  }

  private async generateQRCode() {
    if (!this.reservasiId) return;
    
    try {
      const subscription = this.invoiceService.getQRCode(this.reservasiId)
        .subscribe({
          next: (response) => {
            if (response.success && response.data?.qr_code_base64) {
              // Update QR code di invoice data
              if (this.invoiceData && this.invoiceData.invoice) {
                this.invoiceData.invoice.qr_code = response.data.qr_code_base64;
              }
              console.log('QR Code generated successfully');
            }
          },
          error: (error) => {
            console.error('Generate QR error:', error);
            // QR code error tidak perlu menampilkan alert, cukup log saja
          }
        });

      this.subscriptions.push(subscription);
      
    } catch (err) {
      console.error('QR Code generation failed:', err);
    }
  }

  // Refresh data invoice
  async refreshInvoice() {
    if (!this.reservasiId) return;

    const toast = await this.toastController.create({
      message: 'Memperbarui data invoice...',
      duration: 1000,
      position: 'top'
    });
    await toast.present();

    const subscription = this.invoiceService.getInvoiceData(this.reservasiId)
      .subscribe({
        next: (data) => {
          this.invoiceData = data;
          this.showToast('Data invoice berhasil diperbarui', 'success');
        },
        error: (error) => {
          console.error('Refresh error:', error);
          this.showToast('Gagal memperbarui data', 'danger');
        }
      });

    this.subscriptions.push(subscription);
  }

  // Resend invoice
  async resendInvoice() {
    if (!this.reservasiId) return;

    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: 'Kirim ulang invoice ke email Anda?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Kirim',
          handler: () => {
            this.performResendInvoice();
          }
        }
      ]
    });

    await alert.present();
  }

  private async performResendInvoice() {
    const loading = await this.loadingController.create({
      message: 'Mengirim invoice...'
    });
    await loading.present();

    const subscription = this.invoiceService.resendInvoice(this.reservasiId!)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showToast('Invoice berhasil dikirim ke email Anda', 'success');
          } else {
            this.showToast(response.message || 'Gagal mengirim invoice', 'danger');
          }
        },
        error: (error) => {
          console.error('Resend invoice error:', error);
          this.showToast('Gagal mengirim invoice', 'danger');
        },
        complete: async () => {
          await loading.dismiss();
        }
      });

    this.subscriptions.push(subscription);
  }

  // Getters untuk template
  get invoice() { 
    return this.invoiceData?.invoice || {}; 
  }
  
  get reservasi() { 
    return this.invoiceData?.reservasi || {}; 
  }
  
  get customer() { 
    return this.invoiceData?.customer || {}; 
  }
  
  get items() { 
    return this.invoiceData?.items || []; 
  }
  
  get hasQRCode(): boolean { 
    return !!this.invoice?.qr_code && this.invoice.qr_code !== 'data:image/png;base64,'; 
  }
  
  get qrCodeData(): string { 
    return this.invoice?.qr_code || '';
  }

  get paymentStatus(): string {
    const status = this.invoice?.payment_status;
    switch (status) {
      case 'paid': return 'Lunas';
      case 'partial': return 'Dibayar Sebagian';
      case 'pending': return 'Belum Dibayar';
      default: return 'Tidak Diketahui';
    }
  }

  get paymentStatusColor(): string {
    const status = this.invoice?.payment_status;
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'danger';
      default: return 'medium';
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return 'Rp 0';
    
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  }

  formatShortDate(dateString: string): string {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID');
    } catch (error) {
      return dateString;
    }
  }

  // Alert & Toast helpers
  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({ 
      header, 
      message, 
      buttons: ['OK'] 
    });
    await alert.present();
  }

  private async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }

  // Navigation methods
  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  goToPayment() {
    if (this.reservasiId) {
      this.router.navigate(['/payment', this.reservasiId]);
    }
  }
}