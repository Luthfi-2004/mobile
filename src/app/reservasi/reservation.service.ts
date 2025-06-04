import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Table {
  id: number;
  nomor_meja: string;
  area: string;
  kapasitas: number;
  status: 'tersedia' | 'terisi' | 'dipesan' | 'nonaktif';
  current_reservasi_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReservationData {
  waktu_kedatangan: string;
  jumlah_tamu: number;
  catatan?: string;
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
  reservasi?: any;
  reservations?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = 'http://your-laravel-api.com/api'; // Ganti dengan URL API Laravel Anda
  
  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token'); // Atau sesuaikan dengan cara penyimpanan token Anda
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all available tables
  getTables(): Observable<ApiResponse<Table[]>> {
    return this.http.get<ApiResponse<Table[]>>(`${this.apiUrl}/tables`, {
      headers: this.getHeaders()
    });
  }

  // Create reservation
  createReservation(reservationData: ReservationData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/reservations`, reservationData, {
      headers: this.getHeaders()
    });
  }

  // Get user's reservations
  getUserReservations(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/reservations`, {
      headers: this.getHeaders()
    });
  }

  // Get reservation details
  getReservationDetails(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reservations/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Cancel reservation
  cancelReservation(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/reservations/${id}/cancel`, {}, {
      headers: this.getHeaders()
    });
  }

  // Process payment
  processPayment(reservationId: number, paymentData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/reservations/${reservationId}/payment`, paymentData, {
      headers: this.getHeaders()
    });
  }
}