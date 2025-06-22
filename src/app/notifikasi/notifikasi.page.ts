import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, NotificationData } from '../services/notification.service';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-notifikasi',
  templateUrl: './notifikasi.page.html',
  styleUrls: ['./notifikasi.page.scss'],
  standalone: false
})
export class NotifikasiPage implements OnInit, OnDestroy {
  notifikasi: NotificationData[] = [];
  unreadCount: number = 0;
  loading: boolean = false;
  refreshing: boolean = false;
  currentPage: number = 1;
  lastPage: number = 1;
  canLoadMore: boolean = true;
  showDebug: boolean = false; // Debug mode
  
  private notificationsSubscription?: Subscription;
  private unreadCountSubscription?: Subscription;

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    console.log('NotifikasiPage: ngOnInit called');
    this.initNotifications();
  }

  ngOnDestroy() {
    console.log('NotifikasiPage: ngOnDestroy called');
    this.notificationsSubscription?.unsubscribe();
    this.unreadCountSubscription?.unsubscribe();
  }

  async initNotifications() {
    console.log('NotifikasiPage: Initializing notifications');
    
    // Subscribe to service observables first
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(
      notifications => {
        console.log('NotifikasiPage: Received notifications from service:', notifications);
        this.notifikasi = notifications;
      }
    );

    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(
      count => {
        console.log('NotifikasiPage: Received unread count from service:', count);
        this.unreadCount = count;
      }
    );

    // Then load notifications
    await this.loadNotifikasi();
  }

  async loadNotifikasi(page: number = 1, showLoading: boolean = true) {
    console.log('NotifikasiPage: Loading notifications, page:', page);
    
    if (showLoading && page === 1) {
      this.loading = true;
    }

    try {
      const response = await this.notificationService.fetchNotifications(page).toPromise();
      
      console.log('NotifikasiPage: API Response:', response);
      
      if (response?.success) {
        this.currentPage = response.data.current_page;
        this.lastPage = response.data.last_page;
        this.canLoadMore = this.currentPage < this.lastPage;
        
        console.log('NotifikasiPage: Pagination info:', {
          currentPage: this.currentPage,
          lastPage: this.lastPage,
          canLoadMore: this.canLoadMore,
          dataLength: response.data.data?.length || 0
        });
        
        // Check if we actually got data
        if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          console.log('NotifikasiPage: Successfully loaded', response.data.data.length, 'notifications');
        } else {
          console.log('NotifikasiPage: No notifications data returned from API');
          await this.showToast('Tidak ada notifikasi ditemukan', 'warning');
        }
        
      } else {
        console.error('NotifikasiPage: API response not successful:', response);
        await this.showToast(response?.message || 'Gagal memuat notifikasi', 'danger');
      }
    } catch (error: unknown) {
      console.error('NotifikasiPage: Error loading notifications:', error);

      if (this.isHttpError(error)) {
        if (error.status === 0) {
          await this.showToast('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'danger');
        } else if (error.status === 401) {
          await this.showToast('Sesi telah berakhir. Silakan login kembali.', 'danger');
          // Redirect to login if needed
          // this.router.navigate(['/login']);
        } else if (error.status === 403) {
          await this.showToast('Akses ditolak. Anda tidak memiliki izin.', 'danger');
        } else if (error.status === 404) {
          await this.showToast('Endpoint tidak ditemukan. Periksa konfigurasi API.', 'danger');
        } else if (error.status >= 500) {
          await this.showToast('Terjadi kesalahan pada server. Coba lagi nanti.', 'danger');
        } else {
          await this.showToast('Gagal memuat notifikasi. Coba lagi nanti.', 'danger');
        }
      } else {
        await this.showToast('Terjadi kesalahan tak terduga.', 'danger');
      }
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  async forceRefresh() {
    console.log('NotifikasiPage: Force refresh triggered');
    this.notifikasi = []; // Clear current data
    this.currentPage = 1;
    this.canLoadMore = true;
    await this.notificationService.refreshNotifications().toPromise();
    await this.loadNotifikasi(1, true);
  }

  async markAsRead(notification: NotificationData, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    if (!notification.read_at) {
      try {
        await this.notificationService.markAsRead(notification.id).toPromise();
      } catch (error) {
        console.error('Error marking as read:', error);
        await this.showToast('Gagal menandai notifikasi', 'danger');
      }
    }
  }

  async markAllAsRead() {
    if (this.unreadCount === 0) {
      await this.showToast('Tidak ada notifikasi yang belum dibaca', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: `Tandai ${this.unreadCount} notifikasi sebagai telah dibaca?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Ya',
          handler: async () => {
            try {
              await this.notificationService.markAllAsRead().toPromise();
              await this.showToast('Semua notifikasi telah dibaca', 'success');
            } catch (error) {
              console.error('Error marking all as read:', error);
              await this.showToast('Gagal menandai semua notifikasi', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteNotification(notification: NotificationData, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Hapus Notifikasi',
      message: 'Apakah Anda yakin ingin menghapus notifikasi ini?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: async () => {
            try {
              await this.notificationService.deleteNotification(notification.id).toPromise();
              await this.showToast('Notifikasi berhasil dihapus', 'success');
            } catch (error) {
              console.error('Error deleting notification:', error);
              await this.showToast('Gagal menghapus notifikasi', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async refreshNotifications(event: any) {
    console.log('NotifikasiPage: Pull to refresh triggered');
    this.refreshing = true;
    try {
      await this.forceRefresh();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      await this.showToast('Gagal memuat ulang notifikasi', 'danger');
    } finally {
      this.refreshing = false;
      event.target.complete();
    }
  }

  async loadMore(event: any) {
    console.log('NotifikasiPage: Load more triggered');
    if (this.canLoadMore && !this.loading) {
      try {
        await this.loadNotifikasi(this.currentPage + 1, false);
      } catch (error) {
        console.error('Error loading more notifications:', error);
      } finally {
        event.target.complete();
      }
    } else {
      console.log('NotifikasiPage: Cannot load more or already loading');
      event.target.complete();
    }
  }

  onNotificationClick(notification: NotificationData) {
    console.log('NotifikasiPage: Notification clicked:', notification);
    
    if (!notification.read_at) {
      this.markAsRead(notification);
    }

    if (notification.reservasi_id) {
      this.router.navigate(['/reservasi', notification.reservasi_id]);
    }
  }

  trackByNotificationId(index: number, notification: NotificationData): number {
    return notification.id;
  }

  isUnread(notification: NotificationData): boolean {
    return !notification.read_at;
  }

  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getBadgeColor(type: string): string {
    return this.notificationService.getBadgeColor(type);
  }

  getTypeLabel(type: string): string {
    return this.notificationService.getTypeLabel(type);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Baru saja';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} menit yang lalu`;
    } else if (diffHours < 24) {
      return `${diffHours} jam yang lalu`;
    } else if (diffDays === 1) {
      return 'Kemarin ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays} hari yang lalu`;
    } else {
      return date.toLocaleDateString('id-ID') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Method untuk mendapatkan tanggal dan waktu yang diformat
  getFormattedDateTime(notification: NotificationData): { date: string, time: string } {
    return this.notificationService.getFormattedDateTime(notification);
  }

  getNotificationPriority(type: string): string {
    switch (type) {
      case 'reminder_5_minutes':
        return 'urgent';
      case 'reminder_1_hour':
      case 'payment_success':
      case 'reservation_confirmed':
        return 'high';
      case 'reminder_12_hours':
      case 'reservation_created':
        return 'medium';
      default:
        return 'normal';
    }
  }

  toggleDebug() {
    this.showDebug = !this.showDebug;
    console.log('Debug mode:', this.showDebug ? 'enabled' : 'disabled');
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
      buttons: [
        {
          side: 'end',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  private isHttpError(error: any): error is { status: number } {
    return typeof error === 'object' && error !== null && 'status' in error;
  }
}