import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { InvoiceService } from '../services/invoice.service';

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.page.html',
  styleUrls: ['./invoice.page.scss'],
  standalone: false
})
export class InvoicePage implements OnInit {
  invoiceHistory: any[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private invoiceService: InvoiceService
  ) {}

  ngOnInit() {
    this.loadInvoiceHistory();
  }

  ionViewWillEnter() {
    // Refresh data setiap kali masuk ke halaman
    this.loadInvoiceHistory();
  }

  // TrackBy function for ngFor optimization
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
      // Ambil data dari localStorage (dari cart.page.ts)
      const localHistory = JSON.parse(localStorage.getItem('riwayat') || '[]');
      
      // Jika ada data di localStorage, gunakan itu
      if (localHistory.length > 0) {
        this.invoiceHistory = localHistory.map((item: any) => ({
          ...item,
          // Pastikan format yang konsisten
          invoice_number: item.id,
          tanggal: item.tanggal,
          total_amount: item.total,
          payment_status: this.mapStatus(item.status),
          items: item.items || [],
          reservasi_data: item.reservasi_data || {}
        }));
      }

      // Opsional: Juga ambil dari API jika diperlukan
      // this.loadFromAPI();
      
    } catch (error) {
      console.error('Error loading invoice history:', error);
      await this.showToast('Gagal memuat riwayat invoice', 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  // Opsional: Load dari API jika diperlukan
  private loadFromAPI() {
    this.invoiceService.getUserInvoices().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Merge dengan data localStorage jika diperlukan
          const apiInvoices = response.data.map((item: any) => ({
            ...item,
            source: 'api'
          }));
          // Bisa digabung dengan localStorage data
        }
      },
      error: (error) => {
        console.error('Error loading from API:', error);
      }
    });
  }

  private mapStatus(status: string): string {
    switch (status) {
      case 'Selesai': return 'paid';
      case 'Belum Lunas': return 'pending';
      case 'Pesanan Dibatalkan': return 'cancelled';
      default: return 'pending';
    }
  }

  get hasInvoices(): boolean {
    return this.invoiceHistory.length > 0;
  }

  async lihatDetailInvoice(invoice: any) {
    // Navigate ke invoice-detail dengan ID
    if (invoice.id || invoice.invoice_number) {
      this.router.navigate(['/invoice-detail', invoice.id || invoice.invoice_number]);
    } else {
      await this.showToast('ID Invoice tidak ditemukan', 'warning');
    }
  }

  async hapusInvoice(invoiceId: string) {
    const alert = await this.alertController.create({
      header: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus invoice ini dari riwayat?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => {
            this.performDeleteInvoice(invoiceId);
          }
        }
      ]
    });
    await alert.present();
  }

  private performDeleteInvoice(invoiceId: string) {
    try {
      // Hapus dari localStorage
      const currentHistory = JSON.parse(localStorage.getItem('riwayat') || '[]');
      const updatedHistory = currentHistory.filter((item: any) => 
        item.id !== invoiceId && item.invoice_number !== invoiceId
      );
      
      localStorage.setItem('riwayat', JSON.stringify(updatedHistory));
      
      // Update tampilan
      this.invoiceHistory = this.invoiceHistory.filter(invoice => 
        invoice.id !== invoiceId && invoice.invoice_number !== invoiceId
      );
      
      this.showToast('Invoice berhasil dihapus', 'success');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      this.showToast('Gagal menghapus invoice', 'danger');
    }
  }

  async refreshData() {
    await this.loadInvoiceHistory();
    await this.showToast('Data berhasil diperbarui', 'success');
  }

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
      // Jika sudah dalam format yang readable, return as is
      if (dateString.includes('/') || dateString.includes('-')) {
        return dateString;
      }
      
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'paid': return 'Lunas';
      case 'pending': return 'Belum Dibayar';
      case 'partial': return 'Dibayar Sebagian';
      case 'cancelled': return 'Dibatalkan';
      case 'Selesai': return 'Lunas';
      case 'Belum Lunas': return 'Belum Dibayar';
      case 'Pesanan Dibatalkan': return 'Dibatalkan';
      default: return status || 'Tidak Diketahui';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'paid':
      case 'Selesai':
        return 'success';
      case 'pending':
      case 'Belum Lunas':
        return 'warning';
      case 'partial':
        return 'tertiary';
      case 'cancelled':
      case 'Pesanan Dibatalkan':
        return 'danger';
      default:
        return 'medium';
    }
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  // Utility untuk debugging
  debugInvoice(invoice: any) {
    console.log('Invoice data:', invoice);
  }
}