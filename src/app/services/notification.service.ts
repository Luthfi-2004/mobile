import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, timer, of } from 'rxjs';
import { catchError, map, switchMap, startWith } from 'rxjs/operators';

export interface NotificationData {
  id: number;
  user_id: number;
  reservasi_id?: number;
  type: string;
  title: string;
  message: string;
  data?: {
    kode_reservasi?: string;
    tanggal?: string;
    waktu?: string;
    total_harga?: number;
    reminder_type?: string;
    status?: string;
  };
  read_at?: string | null;
  scheduled_at?: string;
  sent_at?: string | null;
  is_sent: boolean;
  created_at: string;
  updated_at: string;
  reservasi?: {
    id: number;
    kode_reservasi: string;
    tanggal: string;
    waktu: string;
    status: string;
  };
  pengguna?: {
    id: number;
    name: string;
    email: string;
  };
}

interface NotificationResponse {
  success: boolean;
  message: string;
  data: {
    data: NotificationData[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  unread_count: number;
}

interface LatestNotificationResponse {
  success: boolean;
  message: string;
  data: NotificationData[];
  unread_count: number;
  has_new: boolean;
}

interface BaseResponse {
  success: boolean;
  message: string;
}

interface MarkAsReadResponse extends BaseResponse {
  data?: any;
}

interface DeleteResponse extends BaseResponse {
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = 'http://localhost:8000/api';
  private notificationsSubject = new BehaviorSubject<NotificationData[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private lastNotificationId = 0;
  
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  private pollingSubscription: any;
  private isPolling = false;

  constructor(private http: HttpClient) {
    console.log('NotificationService initialized');
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return new HttpHeaders(headers);
  }

  startPolling() {
    if (this.isPolling) {
      console.log('Polling already active');
      return;
    }
    
    console.log('Starting notification polling');
    this.isPolling = true;
    
    this.pollingSubscription = timer(0, 15000).pipe(
      switchMap(() => this.getLatestNotifications())
    ).subscribe({
      next: (response) => {
        console.log('Polling response:', response);
        if (response.success && response.has_new) {
          const currentNotifications = this.notificationsSubject.value;
          
          const allNotifications = [...response.data, ...currentNotifications];
          
          const uniqueNotifications = allNotifications.filter((notification, index, self) => 
            index === self.findIndex(n => n.id === notification.id)
          );
          
          uniqueNotifications.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          this.notificationsSubject.next(uniqueNotifications);
          this.unreadCountSubject.next(response.unread_count);
          
          if (response.data.length > 0) {
            this.lastNotificationId = Math.max(...response.data.map(n => n.id));
          }
        }
      },
      error: (error) => {
        console.error('Polling error:', error);
      }
    });
  }

  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.isPolling = false;
      console.log('Polling stopped');
    }
  }

  private getLatestNotifications(): Observable<LatestNotificationResponse> {
    return this.http.get<LatestNotificationResponse>(
      `${this.baseUrl}/customer/notifications/latest?last_id=${this.lastNotificationId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error fetching latest notifications:', error);
        return of({
          success: false,
          message: 'Error',
          data: [],
          unread_count: 0,
          has_new: false
        });
      })
    );
  }

  fetchNotifications(page: number = 1): Observable<NotificationResponse> {
    console.log('Fetching notifications from:', `${this.baseUrl}/customer/notifications?page=${page}`);
    console.log('Headers:', this.getHeaders());
    
    return this.http.get<NotificationResponse>(
      `${this.baseUrl}/customer/notifications?page=${page}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        console.log('Fetch notifications raw response:', response);
        
        if (response && response.success) {
          // Pastikan data ada dan berbentuk array
          const notifications = response.data?.data || [];
          console.log('Notifications data:', notifications);
          
          if (page === 1) {
            // Reset untuk halaman pertama
            this.notificationsSubject.next(notifications);
            // Update last notification ID
            if (notifications.length > 0) {
              this.lastNotificationId = Math.max(...notifications.map(n => n.id));
            }
          } else {
            // Tambahkan untuk pagination
            const currentNotifications = this.notificationsSubject.value;
            this.notificationsSubject.next([...currentNotifications, ...notifications]);
          }
          this.unreadCountSubject.next(response.unread_count || 0);
        } else {
          console.error('Response not successful or invalid structure:', response);
        }
        return response;
      }),
      catchError(error => {
        console.error('Error fetching notifications details:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error response:', error.error);
        
        const emptyResponse: NotificationResponse = {
          success: false,
          message: error.message || 'Gagal memuat notifikasi',
          data: {
            data: [],
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0
          },
          unread_count: 0
        };
        return of(emptyResponse);
      })
    );
  }

  refreshNotifications(): Observable<NotificationResponse> {
    console.log('Refreshing notifications');
    this.lastNotificationId = 0;
    return this.fetchNotifications(1);
  }

  markAsRead(notificationId: number): Observable<MarkAsReadResponse> {
    return this.http.post<MarkAsReadResponse>(
      `${this.baseUrl}/customer/notifications/${notificationId}/read`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        if (response.success) {
          const notifications = this.notificationsSubject.value;
          const updatedNotifications = notifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read_at: new Date().toISOString() }
              : notification
          );
          this.notificationsSubject.next(updatedNotifications);
          
          const unreadCount = updatedNotifications.filter(n => !n.read_at).length;
          this.unreadCountSubject.next(unreadCount);
        }
        return response;
      })
    );
  }

  markAllAsRead(): Observable<MarkAsReadResponse> {
    return this.http.post<MarkAsReadResponse>(
      `${this.baseUrl}/customer/notifications/mark-all-as-read`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        if (response.success) {
          const notifications = this.notificationsSubject.value;
          const updatedNotifications = notifications.map(notification => ({
            ...notification,
            read_at: notification.read_at || new Date().toISOString()
          }));
          this.notificationsSubject.next(updatedNotifications);
          this.unreadCountSubject.next(0);
        }
        return response;
      })
    );
  }

  deleteNotification(notificationId: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(
      `${this.baseUrl}/customer/notifications/${notificationId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        if (response.success) {
          const notifications = this.notificationsSubject.value;
          const updatedNotifications = notifications.filter(n => n.id !== notificationId);
          this.notificationsSubject.next(updatedNotifications);
          
          const unreadCount = updatedNotifications.filter(n => !n.read_at).length;
          this.unreadCountSubject.next(unreadCount);
        }
        return response;
      })
    );
  }

  reset() {
    console.log('Resetting notification service');
    this.stopPolling();
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.lastNotificationId = 0;
  }

  initialize() {
    console.log('Initializing notification service');
    this.fetchNotifications(1).subscribe({
      next: (response) => {
        console.log('Initialize response:', response);
        this.startPolling();
      },
      error: (error) => {
        console.error('Error initializing notifications:', error);
      }
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'reservation_created':
        return 'calendar-outline';
      case 'payment_success':
        return 'card-outline';
      case 'reservation_confirmed':
        return 'checkmark-circle-outline';
      case 'reminder_12_hours':
      case 'reminder_1_hour':
      case 'reminder_5_minutes':
        return 'alarm-outline';
      case 'reservation_cancelled':
        return 'close-circle-outline';
      default:
        return 'notifications-outline';
    }
  }

  getBadgeColor(type: string): string {
    switch (type) {
      case 'reservation_created':
        return 'primary';
      case 'payment_success':
        return 'success';
      case 'reservation_confirmed':
        return 'primary';
      case 'reminder_12_hours':
      case 'reminder_1_hour':
      case 'reminder_5_minutes':
        return 'warning';
      case 'reservation_cancelled':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'reservation_created':
        return 'Reservasi Dibuat';
      case 'payment_success':
        return 'Pembayaran';
      case 'reservation_confirmed':
        return 'Konfirmasi';
      case 'reminder_12_hours':
        return 'Pengingat 12J';
      case 'reminder_1_hour':
        return 'Pengingat 1J';
      case 'reminder_5_minutes':
        return 'Pengingat 5M';
      case 'reservation_cancelled':
        return 'Pembatalan';
      default:
        return 'Notifikasi';
    }
  }
}