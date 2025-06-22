// src/app/services/notification.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface NotificationData {
  id: number;
  user_id: number;
  reservasi_id?: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  read_at?: string | null;
  created_at: string;
  reservasi?: {
    id: number;
    kode_reservasi: string;
    waktu_kedatangan: string;
    status: string;
  };
  pengguna?: {
    id: number;
    name: string;
    email: string;
  };
  scheduled_at?: string;
  is_sent: boolean;
  sent_at?: string | null;
  updated_at: string;
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
  private baseUrl = environment.apiUrl;
  private notificationsSubject = new BehaviorSubject<NotificationData[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private lastNotificationId = 0;

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private pollingSubscription: any;
  private isPolling = false;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'reservation_created': return 'calendar-outline';
      case 'payment_success': return 'card-outline';
      case 'reservation_confirmed': return 'checkmark-circle-outline';
      case 'order_preparing': return 'restaurant-outline';
      case 'order_completed': return 'checkmark-done-outline';
      case 'reminder_12_hours':
      case 'reminder_1_hour':
      case 'reminder_5_minutes': return 'alarm-outline';
      case 'reservation_cancelled':
      case 'order_cancelled_by_koki': return 'close-circle-outline';
      default: return 'notifications-outline';
    }
  }

  getBadgeColor(type: string): string {
    switch (type) {
      case 'reservation_created':
      case 'reservation_confirmed': return 'primary';
      case 'payment_success': return 'success';
      case 'order_preparing': return 'warning';
      case 'order_completed': return 'success';
      case 'reminder_12_hours':
      case 'reminder_1_hour':
      case 'reminder_5_minutes': return 'warning';
      case 'reservation_cancelled':
      case 'order_cancelled_by_koki': return 'danger';
      default: return 'medium';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'reservation_created': return 'Reservasi Dibuat';
      case 'payment_success': return 'Pembayaran';
      case 'reservation_confirmed': return 'Konfirmasi';
      case 'order_preparing': return 'Dipersiapkan';
      case 'order_completed': return 'Pesanan Selesai';
      case 'reminder_12_hours': return 'Pengingat 12J';
      case 'reminder_1_hour': return 'Pengingat 1J';
      case 'reminder_5_minutes': return 'Pengingat 5M';
      case 'reservation_cancelled': return 'Dibatalkan';
      case 'order_cancelled_by_koki': return 'Dibatalkan Dapur';
      default: return 'Notifikasi';
    }
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.pollingSubscription = timer(0, 15000).pipe(
      switchMap(() => this.fetchNotifications(1))
    ).subscribe();
  }

  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    this.isPolling = false;
  }

  fetchNotifications(page: number = 1): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(`${this.baseUrl}/customer/notifications?page=${page}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (response?.success) {
          const notifications = response.data?.data || [];
          if (page === 1) {
            this.notificationsSubject.next(notifications);
            if (notifications.length > 0) {
              this.lastNotificationId = Math.max(...notifications.map(n => n.id));
            }
          } else {
            const current = this.notificationsSubject.value;
            const merged = [...current, ...notifications];
            const unique = merged.filter((n, i, self) =>
              i === self.findIndex(x => x.id === n.id)
            );
            this.notificationsSubject.next(unique);
          }
          this.unreadCountSubject.next(response.unread_count || 0);
        }
        return response;
      }),
      catchError(() => {
        const empty: NotificationResponse = {
          success: false,
          message: 'Gagal memuat notifikasi',
          data: {
            data: [],
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0
          },
          unread_count: 0
        };
        return of(empty);
      })
    );
  }

  refreshNotifications(): Observable<NotificationResponse> {
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
          const updated = this.notificationsSubject.value.map(n =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          );
          this.notificationsSubject.next(updated);
          this.unreadCountSubject.next(updated.filter(n => !n.read_at).length);
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
          const updated = this.notificationsSubject.value.map(n => ({
            ...n,
            read_at: n.read_at || new Date().toISOString()
          }));
          this.notificationsSubject.next(updated);
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
          const updated = this.notificationsSubject.value.filter(n => n.id !== notificationId);
          this.notificationsSubject.next(updated);
          this.unreadCountSubject.next(updated.filter(n => !n.read_at).length);
        }
        return response;
      })
    );
  }

  initialize() {
    this.fetchNotifications(1).subscribe({
      next: () => this.startPolling(),
      error: () => this.startPolling()
    });
  }

  reset() {
    this.stopPolling();
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.lastNotificationId = 0;
  }

  getFormattedDateTime(notification: NotificationData): { date: string, time: string } {
    let dtStr = notification.data?.waktu_kedatangan ||
                notification.reservasi?.waktu_kedatangan ||
                (notification.data?.tanggal && notification.data?.waktu
                  ? `${notification.data.tanggal} ${notification.data.waktu}`
                  : '');

    if (dtStr) {
      const date = new Date(dtStr);
      return {
        date: date.toLocaleDateString('id-ID'),
        time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
    }
    return { date: '', time: '' };
  }
}
