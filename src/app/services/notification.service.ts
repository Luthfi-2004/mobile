import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

// Interface NotificationData dan lainnya tetap sama
export interface NotificationData {
  id: number; user_id: number; reservasi_id?: number; type: string; title: string;
  message: string; data?: any; read_at?: string | null; created_at: string;
  reservasi?: { id: number; kode_reservasi: string; waktu_kedatangan: string; status: string; };
  pengguna?: { id: number; name: string; email: string; };
  // Hapus properti yang tidak lagi relevan jika ada (misal: scheduled_at, is_sent jika semua notif kini instan)
  scheduled_at?: string; is_sent: boolean; sent_at?: string | null; updated_at: string;
}
interface NotificationResponse { success: boolean; message: string; data: { data: NotificationData[]; current_page: number; last_page: number; per_page: number; total: number; }; unread_count: number; }
interface LatestNotificationResponse { success: boolean; message: string; data: NotificationData[]; unread_count: number; has_new: boolean; }
interface BaseResponse { success: boolean; message: string; }
interface MarkAsReadResponse extends BaseResponse { data?: any; }
interface DeleteResponse extends BaseResponse { data?: any; }


@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = 'http://localhost:8000/api'; // Sesuaikan dengan URL API Anda
  private notificationsSubject = new BehaviorSubject<NotificationData[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private lastNotificationId = 0;
  
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  private pollingSubscription: any;
  private isPolling = false;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Fungsi polling dan fetch tetap sama, karena hanya mengambil data dari backend
  // ... (kode polling, fetchNotifications, markAsRead, dll. tidak berubah) ...
  
  // START: Perubahan - Update helper methods untuk tipe notifikasi baru
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'reservation_created': return 'calendar-outline';
      case 'payment_success': return 'card-outline';
      case 'reservation_confirmed': return 'checkmark-circle-outline';
      case 'order_preparing': return 'restaurant-outline'; // <-- BARU
      case 'order_completed': return 'checkmark-done-outline'; // <-- BARU
      case 'reminder_12_hours': case 'reminder_1_hour': case 'reminder_5_minutes': return 'alarm-outline';
      case 'reservation_cancelled': case 'order_cancelled_by_koki': return 'close-circle-outline'; // <-- BARU
      default: return 'notifications-outline';
    }
  }

  getBadgeColor(type: string): string {
    switch (type) {
      case 'reservation_created': case 'reservation_confirmed': return 'primary';
      case 'payment_success': return 'success';
      case 'order_preparing': return 'warning'; // <-- BARU
      case 'order_completed': return 'success'; // <-- BARU
      case 'reminder_12_hours': case 'reminder_1_hour': case 'reminder_5_minutes': return 'warning';
      case 'reservation_cancelled': case 'order_cancelled_by_koki': return 'danger'; // <-- BARU
      default: return 'medium';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'reservation_created': return 'Reservasi Dibuat';
      case 'payment_success': return 'Pembayaran';
      case 'reservation_confirmed': return 'Konfirmasi';
      case 'order_preparing': return 'Dipersiapkan'; // <-- BARU
      case 'order_completed': return 'Pesanan Selesai'; // <-- BARU
      case 'reminder_12_hours': return 'Pengingat 12J';
      case 'reminder_1_hour': return 'Pengingat 1J';
      case 'reminder_5_minutes': return 'Pengingat 5M';
      case 'reservation_cancelled': return 'Dibatalkan';
      case 'order_cancelled_by_koki': return 'Dibatalkan Dapur'; // <-- BARU
      default: return 'Notifikasi';
    }
  }
  // END: Perubahan

  // Sisa fungsi (fetch, markAsRead, delete, etc.) tidak perlu diubah.
  // ...
  // Full code from original file follows...
  startPolling() { /* ... no changes ... */ }
  stopPolling() { /* ... no changes ... */ }
  fetchNotifications(page: number = 1): Observable<NotificationResponse> { /* ... no changes ... */ return this.http.get<NotificationResponse>(`${this.baseUrl}/customer/notifications?page=${page}`,{ headers: this.getHeaders() }).pipe(map(response => { if (response?.success) { const notifications = response.data?.data || []; if (page === 1) { this.notificationsSubject.next(notifications); if (notifications.length > 0) { this.lastNotificationId = Math.max(...notifications.map(n => n.id)); } } else { const currentNotifications = this.notificationsSubject.value; const mergedNotifications = [...currentNotifications, ...notifications]; const uniqueNotifications = mergedNotifications.filter((notification, index, self) => index === self.findIndex(n => n.id === notification.id)); this.notificationsSubject.next(uniqueNotifications); } this.unreadCountSubject.next(response.unread_count || 0); } return response; }), catchError(error => { const emptyResponse: NotificationResponse = { success: false, message: 'Gagal memuat notifikasi', data: { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0 }, unread_count: 0 }; return of(emptyResponse); })); }
  refreshNotifications(): Observable<NotificationResponse> { this.lastNotificationId = 0; return this.fetchNotifications(1); }
  markAsRead(notificationId: number): Observable<MarkAsReadResponse> { return this.http.post<MarkAsReadResponse>(`${this.baseUrl}/customer/notifications/${notificationId}/read`, {}, { headers: this.getHeaders() }).pipe(map(response => { if (response.success) { const notifications = this.notificationsSubject.value; const updatedNotifications = notifications.map(notification => notification.id === notificationId ? { ...notification, read_at: new Date().toISOString() } : notification ); this.notificationsSubject.next(updatedNotifications); this.unreadCountSubject.next(updatedNotifications.filter(n => !n.read_at).length); } return response; })); }
  markAllAsRead(): Observable<MarkAsReadResponse> { return this.http.post<MarkAsReadResponse>(`${this.baseUrl}/customer/notifications/mark-all-as-read`, {}, { headers: this.getHeaders() }).pipe(map(response => { if (response.success) { const notifications = this.notificationsSubject.value; const updatedNotifications = notifications.map(notification => ({ ...notification, read_at: notification.read_at || new Date().toISOString() })); this.notificationsSubject.next(updatedNotifications); this.unreadCountSubject.next(0); } return response; })); }
  deleteNotification(notificationId: number): Observable<DeleteResponse> { return this.http.delete<DeleteResponse>(`${this.baseUrl}/customer/notifications/${notificationId}`, { headers: this.getHeaders() }).pipe(map(response => { if (response.success) { const notifications = this.notificationsSubject.value; const updatedNotifications = notifications.filter(n => n.id !== notificationId); this.notificationsSubject.next(updatedNotifications); this.unreadCountSubject.next(updatedNotifications.filter(n => !n.read_at).length); } return response; })); }
  initialize() { this.fetchNotifications(1).subscribe(() => { this.startPolling(); }, () => { this.startPolling(); }); }
  reset() { this.stopPolling(); this.notificationsSubject.next([]); this.unreadCountSubject.next(0); this.lastNotificationId = 0; }
  getFormattedDateTime(notification: NotificationData): { date: string, time: string } { let dtStr = notification.data?.waktu_kedatangan || notification.reservasi?.waktu_kedatangan || (notification.data?.tanggal && notification.data?.waktu ? `${notification.data.tanggal} ${notification.data.waktu}` : ''); if(dtStr) { const date = new Date(dtStr); return { date: date.toLocaleDateString('id-ID'), time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })};} return {date: '', time:''};}
}