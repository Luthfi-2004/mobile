import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReservationData {
  waktu_kedatangan: string;
  jumlah_tamu: number;
  catatan?: string;
  id_meja: number[];   // Array of meja IDs (primary key)
}

export interface ReservationResponse {
  message: string;
  reservasi: {
    id: number;
    user_id: number;
    meja: Array<{
      id: number;
      nomor_meja: string;
      area: string;
      kapasitas: number;
      status: string;
    }>;
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
  // Pastikan environment.apiUrl hanya sampai '/api', tanpa '/customer'
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  createReservation(data: ReservationData): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(
      `${this.apiUrl}/customer/reservations`,
      data,
      { headers: this.getHeaders() }
    );
  }

  getReservations(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/customer/reservations`,
      { headers: this.getHeaders() }
    );
  }

  getReservationDetail(id: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/customer/reservations/${id}`,
      { headers: this.getHeaders() }
    );
  }

  cancelReservation(id: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/customer/reservations/${id}/cancel`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getBookedTimes(date: string): Observable<{ booked_times: string[] }> {
    return this.http.get<{ booked_times: string[] }>(
      // Panggil endpoint /api/customer/reservations/booked‑times
      `${this.apiUrl}/customer/reservations/booked-times?date=${date}`,
      { headers: this.getHeaders() }
    );
  }
}
