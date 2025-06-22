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
  showDebug: boolean = false;
  
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
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifikasi = notifications;
      }
    );

    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(
      count => {
        this.unreadCount = count;
      }
    );

    this.loadNotifikasi(true);
  }

  ngOnDestroy() {
    this.notificationsSubscription?.unsubscribe();
    this.unreadCountSubscription?.unsubscribe();
  }

  async loadNotifikasi(showLoading: boolean = false, event: any = null) {
    if (showLoading) {
      this.loading = true;
    }

    try {
      const response = await this.notificationService.fetchNotifications(this.currentPage).toPromise();
      
      if (response?.success) {
        // Logika fetchNotifications di service sudah menangani penambahan data
        this.currentPage = response.data.current_page;
        this.lastPage = response.data.last_page;
        this.canLoadMore = this.currentPage < this.lastPage;
      } else {
        await this.showToast(response?.message || 'Gagal memuat notifikasi', 'danger');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      await this.showToast('Gagal memuat notifikasi. Periksa koneksi Anda.', 'danger');
    } finally {
      this.loading = false;
      if (event) {
        event.target.complete();
      }
    }
  }

  async refreshNotifications(event: any) {
    this.currentPage = 1;
    this.canLoadMore = true;
    try {
      // Panggil metode refresh dari service yang akan me-reset dan fetch dari awal
      await this.notificationService.refreshNotifications().toPromise();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      event.target.complete();
    }
  }

  async loadMore(event: any) {
    if (!this.canLoadMore) {
      event.target.complete();
      return;
    }
    
    this.currentPage++;
    await this.loadNotifikasi(false, event);
  }

  onNotificationClick(notification: NotificationData) {
    if (!notification.read_at) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    if (notification.reservasi_id) {
      this.router.navigate(['/reservasi', notification.reservasi_id]);
    }
  }

  async deleteNotification(notification: NotificationData, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Hapus Notifikasi',
      message: 'Apakah Anda yakin ingin menghapus notifikasi ini?',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: async () => {
            this.notificationService.deleteNotification(notification.id).subscribe({
              next: () => this.showToast('Notifikasi berhasil dihapus.', 'success'),
              error: () => this.showToast('Gagal menghapus notifikasi.', 'danger'),
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async markAllAsRead() {
    if (this.unreadCount === 0) return;
    this.notificationService.markAllAsRead().subscribe({
      next: () => this.showToast('Semua notifikasi ditandai telah dibaca.', 'success'),
      error: () => this.showToast('Gagal menandai semua notifikasi.', 'danger'),
    });
  }
  
  // Fungsi-fungsi pembantu yang dipanggil dari HTML
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
  
  getFormattedDateTime(notification: NotificationData): { date: string, time: string } {
    return this.notificationService.getFormattedDateTime(notification);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  }

  getNotificationPriority(type: string): string {
    switch (type) {
      case 'reminder_5_minutes':
        return 'urgent';
      case 'order_preparing': // Notifikasi dari koki
        return 'high';
      case 'payment_success':
      case 'reservation_confirmed':
        return 'high';
      case 'order_completed': // Notifikasi dari koki
      case 'reminder_1_hour':
      case 'reservation_created':
        return 'medium';
      default:
        return 'normal';
    }
  }

  trackByNotificationId(index: number, notification: NotificationData): number {
    return notification.id;
  }
  
  toggleDebug() {
    this.showDebug = !this.showDebug;
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
    });
    await toast.present();
  }
}