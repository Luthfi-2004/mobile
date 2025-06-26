import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { InvoiceService } from 'src/app/services/invoice.service';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth.service';

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.page.html',
  styleUrls: ['./invoice.page.scss'],
  standalone: false,
})
export class InvoicePage implements OnInit, OnDestroy {
  invoiceHistory: any[] = [];
  isLoading = false;
  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private invoiceService: InvoiceService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadInvoiceHistory();
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ionViewWillEnter() {
    this.loadInvoiceHistory();
  }

  trackByInvoiceId(index: number, invoice: any): any {
    return invoice.id || invoice.invoice_number || index;
  }

  async loadInvoiceHistory() {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Memuat riwayat invoice...',
      spinner: 'dots'
    });
    await loading.present();

    try {
      // Dapatkan user ID
      const userId = this.authService.getCurrentUserId();
      const storageKey = `riwayat_${userId}`;
      
      const raw: any[] = JSON.parse(sessionStorage.getItem(storageKey) || '[]');

      // Map data
      this.invoiceHistory = raw.map(item => {
        return {
          id: item.id,
          invoice_number: item.invoice?.invoice_number || item.invoice_number || item.id,
          tanggal: item.invoice?.generated_at || item.created_at || item.tanggal,
          total_amount: item.invoice?.total_amount || item.total || 0,
          items: item.items || [],
          payment_method: item.invoice?.payment_method || item.payment_method || null,
          customer: item.customer || {},
          reservasi: item.reservasi || item.reservasi_data || {},
          invoice: item.invoice || {}
        };
      });

      // Ambil status terbaru dari server untuk setiap invoice
      for (const inv of this.invoiceHistory) {
        const id = inv.id || inv.invoice_number;
        if (id) {
          const sub = this.invoiceService.getInvoiceData(id).subscribe({
            next: (data: any) => {
              if (data) {
                // Update data sesuai dengan struktur yang sama
                if (data.invoice) {
                  inv.invoice = { ...inv.invoice, ...data.invoice };
                }
                if (data.reservasi) {
                  inv.reservasi = { ...inv.reservasi, ...data.reservasi };
                }
                if (data.customer) {
                  inv.customer = { ...inv.customer, ...data.customer };
                }
                
                // Paksa update tampilan
                this.cdr.detectChanges();
              }
            },
            error: (err) => {
              console.error('Gagal mengambil data invoice:', err);
            }
          });
          this.subs.push(sub);
        }
      }

    } catch (err) {
      console.error('Gagal memuat invoice:', err);
      await this.showToast('Gagal memuat riwayat invoice', 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  // SAMA PERSIS DENGAN INVOICE-DETAIL
  getPaymentStatusText(inv: any): string {
    let rawField = inv.invoice?.payment_status;
    let raw: string;
    if (typeof rawField === 'string') {
      raw = rawField.trim();
    } else {
      raw = (inv.reservasi?.payment_status ?? '').toString().trim();
    }

    const st = raw.toLowerCase();
    switch (st) {
      case 'paid':    return 'Lunas';
      case 'partial': return 'Dibayar Sebagian';
      case 'pending': return 'Belum Dibayar';
      case 'dibatalkan': return 'Dibatalkan';
      default:        return 'Tidak Diketahui';
    }
  }

  // SAMA PERSIS DENGAN INVOICE-DETAIL
  getPaymentStatusColor(inv: any): string {
    let rawField = inv.invoice?.payment_status;
    let raw: string;
    if (typeof rawField === 'string') {
      raw = rawField.trim();
    } else {
      raw = (inv.reservasi?.payment_status ?? '').toString().trim();
    }

    const st = raw.toLowerCase();
    switch (st) {
      case 'paid':    return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'primary';
      case 'dibatalkan': return 'danger';
      default:        return 'medium';
    }
  }

  // Sama seperti di invoice-detail
  getCustomerName(inv: any): string {
    return inv.customer?.nama_pelanggan || 
           inv.reservasi?.nama_pelanggan || 
           'Tidak tersedia';
  }

  get hasInvoices(): boolean {
    return this.invoiceHistory.length > 0;
  }

  lihatDetailInvoice(inv: any) {
    const id = inv.id || inv.invoice_number;
    if (id) {
      this.router.navigate(['/invoice-detail', id]);
    } else {
      this.showToast('ID Invoice tidak ditemukan', 'warning');
    }
  }

  async hapusInvoice(invoiceId: string) {
    const alert = await this.alertController.create({
      header: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus invoice ini dari riwayat?',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        { text: 'Hapus', role: 'destructive', handler: () => this.performDeleteInvoice(invoiceId) }
      ]
    });
    await alert.present();
  }

  private performDeleteInvoice(invoiceId: string) {
    try {
      // Dapatkan user ID
      const userId = this.authService.getCurrentUserId();
      const storageKey = `riwayat_${userId}`;
      
      const current: any[] = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      const updated = current.filter(i => i.id !== invoiceId && i.invoice_number !== invoiceId);
      sessionStorage.setItem(storageKey, JSON.stringify(updated));
      
      this.invoiceHistory = this.invoiceHistory.filter(inv => 
        inv.id !== invoiceId && inv.invoice_number !== invoiceId
      );
      
      this.showToast('Invoice berhasil dihapus', 'success');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      this.showToast('Gagal menghapus invoice', 'danger');
    }
  }

  async refreshData() {
    await this.loadInvoiceHistory();
    await this.showToast('Data berhasil diperbarui', 'success');
  }

  formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        const match = dateString.match(/(\d{1,2})\s+(\w+)\s+(\d{4})[^\d]*(\d{1,2})[.:](\d{2})/);
        if (match) {
          const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                         'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          const monthIndex = months.findIndex(m => m.toLowerCase().startsWith(match[2].toLowerCase()));
          if (monthIndex !== -1) {
            dateString = `${match[3]}-${monthIndex + 1}-${match[1]}T${match[4]}:${match[5]}:00`;
            return this.formatDate(dateString);
          }
        }
        return dateString;
      }
      
      return date.toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  private async showToast(message: string, color: string = 'primary') {
    const t = await this.toastController.create({ message, duration: 2000, position: 'top', color });
    await t.present();
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }
}