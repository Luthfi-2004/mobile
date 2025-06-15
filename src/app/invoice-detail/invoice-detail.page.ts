import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { InvoiceService } from '../services/invoice.service';
import { Subscription, lastValueFrom } from 'rxjs';

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
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadInvoiceData() {
    this.loadingController
      .create({ message: 'Memuat invoice...', spinner: 'dots' })
      .then(loading => {
        loading.present();
        const sub = this.invoiceService.getInvoiceData(this.reservasiId!)
          .subscribe({
            next: data => {
              this.invoiceData = data;
              // Debug: lihat sumber payment_status
              console.log('▶︎ invoice.payment_status:', this.invoiceData.invoice?.payment_status);
              console.log('▶︎ reservasi.payment_status:', this.invoiceData.reservasi?.payment_status);
              this.fetchQrCodePayload();
            },
            error: err => {
              console.error(err);
              this.showAlert('Error', err.message);
              this.router.navigate(['/tabs/home']);
            },
            complete: () => loading.dismiss()
          });
        this.subscriptions.push(sub);
      });
  }

  private fetchQrCodePayload() {
    if (!this.reservasiId) return;
    const sub = this.invoiceService.getQRCode(this.reservasiId)
      .subscribe({
        next: res => {
          if (res.success && res.data?.kode_reservasi) {
            this.invoiceData = {
              ...this.invoiceData,
              invoice: {
                ...this.invoiceData.invoice,
                kode_reservasi: res.data.kode_reservasi
              }
            };
          }
        },
        error: err => console.error('QR fetch error:', err)
      });
    this.subscriptions.push(sub);
  }

  async refreshInvoice() {
    if (!this.reservasiId) return;
    const toast = await this.toastController.create({
      message: 'Memperbarui data invoice...',
      duration: 1000,
      position: 'top'
    });
    await toast.present();

    const sub = this.invoiceService.getInvoiceData(this.reservasiId)
      .subscribe({
        next: data => {
          this.invoiceData = data;
          this.showToast('Data invoice berhasil diperbarui', 'success');
        },
        error: error => {
          console.error(error);
          this.showToast('Gagal memperbarui data', 'danger');
        }
      });
    this.subscriptions.push(sub);
  }

  async resendInvoice() {
    if (!this.reservasiId) return;
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: 'Kirim ulang invoice ke email Anda?',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        { text: 'Kirim', handler: () => this.performResendInvoice() }
      ]
    });
    await alert.present();
  }

  private async performResendInvoice() {
    const loading = await this.loadingController.create({ message: 'Mengirim invoice...' });
    await loading.present();

    const sub = this.invoiceService.resendInvoice(this.reservasiId!)
      .subscribe({
        next: response => {
          this.showToast(
            response.success
              ? 'Invoice berhasil dikirim ke email Anda'
              : (response.message || 'Gagal mengirim invoice'),
            response.success ? 'success' : 'danger'
          );
        },
        error: error => {
          console.error(error);
          this.showToast('Gagal mengirim invoice', 'danger');
        },
        complete: async () => await loading.dismiss()
      });
    this.subscriptions.push(sub);
  }

  /** Getters untuk template */
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

  /**
   * Ambil payment_status:
   * - Jika invoice.payment_status adalah string, pakai itu
   * - Jika bukan, pakai reservasi.payment_status
   * Lalu normalisasi dan switch ke label.
   */
  get paymentStatus(): string {
    let rawField = this.invoice.payment_status;
    let raw: string;
    if (typeof rawField === 'string') {
      raw = rawField.trim();
    } else {
      raw = (this.reservasi.payment_status ?? '').toString().trim();
    }

    const st = raw.toLowerCase();
    console.log('▶︎ normalized status:', st);

    switch (st) {
      case 'paid':    return 'Lunas';
      case 'partial': return 'Dibayar Sebagian';
      case 'pending': return 'Belum Dibayar';
      case 'dibatalkan': return 'Dibatalkan';
      default:        return 'Tidak Diketahui';
    }
  }

  /**
   * Sama seperti paymentStatus, tapi mengembalikan warna Ionic.
   */
  get paymentStatusColor(): string {
    let rawField = this.invoice.payment_status;
    let raw: string;
    if (typeof rawField === 'string') {
      raw = rawField.trim();
    } else {
      raw = (this.reservasi.payment_status ?? '').toString().trim();
    }

    const st = raw.toLowerCase();
    console.log('▶︎ normalized color-key:', st);

    switch (st) {
      case 'paid':    return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'primary';
      case 'dibatalkan': return 'danger';
      default:        return 'medium';
    }
  }

  /** Utility methods */
  formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return 'Rp 0';
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
      return new Date(dateString).toLocaleString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  formatShortDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID');
    } catch {
      return dateString;
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  private async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message, duration: 2000, position: 'top', color
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  goToPayment() {
    if (this.reservasiId) {
      this.router.navigate(['/payment', this.reservasiId]);
    }
  }
}
