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
    waktu_kedatangan?: string;
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
    tanggal?: string;
    waktu?: string;
    waktu_kedatangan: string;
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
  private lastPollTime = 0;
  
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  private pollingSubscription: any;
  private isPolling = false;
  private isProcessing = false; // Prevent concurrent processing
  
  // Reduced polling frequency and increased debounce
  private readonly POLLING_INTERVAL = 45000; // 45 seconds
  private readonly DEBOUNCE_TIME = 5000; // 5 seconds debounce
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private retryCount = 0;

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
    
    console.log('Starting notification polling with interval:', this.POLLING_INTERVAL);
    this.isPolling = true;
    this.retryCount = 0;
    
    // Start with immediate check, then regular intervals
    this.pollingSubscription = timer(5000, this.POLLING_INTERVAL).pipe(
      switchMap(() => {
        const now = Date.now();
        
        // Skip if still processing or too soon since last poll
        if (this.isProcessing || (now - this.lastPollTime < this.DEBOUNCE_TIME)) {
          console.log('Skipping poll - processing or debouncing');
          return of({ success: false, message: 'Skipped', data: [], unread_count: 0, has_new: false });
        }
        
        this.lastPollTime = now;
        return this.getLatestNotifications();
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.retryCount = 0; // Reset retry count on success
          
          if (response.has_new && response.data.length > 0) {
            console.log('New notifications received:', response.data.length);
            this.processNewNotifications(response.data, response.unread_count);
          }
        }
      },
      error: (error) => {
        console.error('Polling error:', error);
        this.handlePollingError();
      }
    });
  }

  private handlePollingError() {
    this.retryCount++;
    
    if (this.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      console.log('Max retry attempts reached, stopping polling');
      this.stopPolling();
      
      // Restart polling after a longer delay
      setTimeout(() => {
        this.retryCount = 0;
        this.startPolling();
      }, 60000); // 1 minute delay before restart
    }
  }

  private async processNewNotifications(newNotifications: NotificationData[], unreadCount: number) {
    if (this.isProcessing) {
      console.log('Already processing notifications, skipping');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const currentNotifications = this.notificationsSubject.value;
      
      // Filter notifications based on their scheduled time and sent status
      const validNotifications = newNotifications.filter(newNotif => {
        // Check if notification already exists
        const exists = currentNotifications.some(existing => existing.id === newNotif.id);
        if (exists) {
          return false;
        }
        
        // If notification has scheduled_at, check if it's time to show
        if (newNotif.scheduled_at && !newNotif.is_sent) {
          const scheduledTime = new Date(newNotif.scheduled_at);
          const now = new Date();
          const timeDiff = now.getTime() - scheduledTime.getTime();
          
          // Only show if scheduled time has passed and within reasonable window (5 minutes)
          const shouldShow = timeDiff >= 0 && timeDiff <= 300000; // 5 minutes window
          
          if (!shouldShow) {
            console.log(`Notification ${newNotif.id} not ready to show:`, {
              scheduledTime: scheduledTime.toISOString(),
              now: now.toISOString(),
              timeDiff: timeDiff / 1000 + ' seconds'
            });
            return false;
          }
        }
        
        return true;
      });
      
      if (validNotifications.length === 0) {
        console.log('No valid new notifications to process');
        return;
      }
      
      console.log('Processing valid notifications:', validNotifications.length);
      
      // Sort valid notifications by scheduled time and created time
      validNotifications.sort((a, b) => {
        const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : new Date(a.created_at).getTime();
        const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : new Date(b.created_at).getTime();
        return timeA - timeB; // Oldest first
      });
      
      // Process notifications one by one with slight delay to prevent bunching
      for (let i = 0; i < validNotifications.length; i++) {
        const notification = validNotifications[i];
        
        // Add notification to current list
        const updatedNotifications = [notification, ...currentNotifications];
        
        // Remove duplicates based on ID
        const uniqueNotifications = updatedNotifications.filter((notif, index, self) => 
          index === self.findIndex(n => n.id === notif.id)
        );
        
        // Sort by creation time (newest first)
        uniqueNotifications.sort((a, b) => {
  // Prioritaskan 'sent_at', jika tidak ada, gunakan 'created_at'
          const timeA = new Date(a.sent_at || a.created_at).getTime();
          const timeB = new Date(b.sent_at || b.created_at).getTime();
          return timeB - timeA;
        });

        
        this.notificationsSubject.next(uniqueNotifications);
        
        // Update last notification ID
        if (notification.id > this.lastNotificationId) {
          this.lastNotificationId = notification.id;
        }
        
        // Small delay between notifications to prevent bunching
        if (i < validNotifications.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Update unread count
      this.unreadCountSubject.next(unreadCount);
      
    } catch (error) {
      console.error('Error processing notifications:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.isPolling = false;
      this.isProcessing = false;
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
    
    return this.http.get<NotificationResponse>(
      `${this.baseUrl}/customer/notifications?page=${page}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        console.log('Fetch notifications response:', response);
        
        if (response && response.success) {
          const notifications = response.data?.data || [];
          console.log('Processing notifications:', notifications.length);
          
          if (page === 1) {
            // Reset for first page
            this.notificationsSubject.next(notifications);
            // Update last notification ID
            if (notifications.length > 0) {
              this.lastNotificationId = Math.max(...notifications.map(n => n.id));
            }
          } else {
            // Append for pagination
            const currentNotifications = this.notificationsSubject.value;
            const mergedNotifications = [...currentNotifications, ...notifications];
            
            // Remove duplicates
            const uniqueNotifications = mergedNotifications.filter((notification, index, self) => 
              index === self.findIndex(n => n.id === notification.id)
            );
            
            this.notificationsSubject.next(uniqueNotifications);
          }
          this.unreadCountSubject.next(response.unread_count || 0);
        }
        return response;
      }),
      catchError(error => {
        console.error('Error fetching notifications:', error);
        
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
    this.lastPollTime = 0;
    this.isProcessing = false;
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
    this.lastPollTime = 0;
    this.isProcessing = false;
    this.retryCount = 0;
  }

  initialize() {
    console.log('Initializing notification service');
    this.fetchNotifications(1).subscribe({
      next: (response) => {
        console.log('Initialize response:', response);
        // Delay polling start to avoid immediate duplicate requests
        setTimeout(() => {
          this.startPolling();
        }, 2000); // Increased delay
      },
      error: (error) => {
        console.error('Error initializing notifications:', error);
        // Still start polling even if initial fetch fails
        setTimeout(() => {
          this.startPolling();
        }, 5000);
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

  // Helper method to get formatted datetime for notifications
  getFormattedDateTime(notification: NotificationData): { date: string, time: string } {
    // Priority order: data.waktu_kedatangan > reservasi.waktu_kedatangan > data.tanggal + data.waktu
    let dateTimeString = '';
    
    if (notification.data?.waktu_kedatangan) {
      dateTimeString = notification.data.waktu_kedatangan;
    } else if (notification.reservasi?.waktu_kedatangan) {
      dateTimeString = notification.reservasi.waktu_kedatangan;
    } else if (notification.data?.tanggal && notification.data?.waktu) {
      dateTimeString = `${notification.data.tanggal} ${notification.data.waktu}`;
    }
    
    if (dateTimeString) {
      const date = new Date(dateTimeString);
      return {
        date: date.toLocaleDateString('id-ID'),
        time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
    }
    
    return { date: '', time: '' };
  }
}