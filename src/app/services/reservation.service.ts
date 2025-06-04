import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReservationData {
  waktu_kedatangan: string;
  jumlah_tamu: number;
  catatan?: string;
}

export interface ReservationResponse {
  message: string;
  reservasi: {
    id: number;
    user_id: number;
    meja_id: number;
    nama_pelanggan: string;
    waktu_kedatangan: string;
    jumlah_tamu: number;
    kehadiran_status: string;
    status: string;
    source: string;
    kode_reservasi: string;
    catatan?: string;
    total_bill: number;
    created_at: string;
    updated_at: string;
  };
}

export interface ApiErrorResponse {
  message: string;
  error?: string;
  errors?: { [key: string]: string[] };
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = `${environment.apiUrl}/customer`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  createReservation(data: ReservationData): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(
      `${this.apiUrl}/reservations`,
      data,
      { headers: this.getHeaders() }
    );
  }

  getReservations(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/reservations`,
      { headers: this.getHeaders() }
    );
  }

  getReservationDetail(id: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/reservations/${id}`,
      { headers: this.getHeaders() }
    );
  }

  cancelReservation(id: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/reservations/${id}/cancel`,
      {},
      { headers: this.getHeaders() }
    );
  }
}