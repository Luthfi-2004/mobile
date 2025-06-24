// src/app/services/invoice.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment'; // BARU: Import environment

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  // DIUBAH: Menggunakan environment variable untuk konsistensi
  private apiUrl = `${environment.apiUrl}/customer`;

  constructor(private http: HttpClient) { }

  // Metode ini sudah menjadi standar yang baik untuk direplikasi
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

  /**
   * Transform API data jadi shape yang template butuhkan
   */
  private transformInvoiceData(data: any): any {
    const invoiceRaw   = data.invoice;
    const reservasiRaw = data.reservasi;

    // normalize meja jadi array
    let mejaArr = [];
    if (Array.isArray(reservasiRaw.meja)) {
      mejaArr = reservasiRaw.meja;
    } else if (reservasiRaw.meja) {
      mejaArr = [reservasiRaw.meja];
    }

    return {
      invoice: {
        ...invoiceRaw,
        kode_reservasi: invoiceRaw.kode_reservasi || data.reservasi.kode_reservasi
      },
      reservasi: {
        ...reservasiRaw,
        meja: mejaArr
      },
      customer: data.customer,
      items: data.items || []
    };
  }

  getInvoiceData(reservasiId: string): Observable<any> {
    return this.http
      .get<{ success: boolean; data: any }>(
        `${this.apiUrl}/invoices/${reservasiId}`,
        { headers: this.getHeaders() }
      )
      .pipe(
        map(resp => {
          if (!resp.success || !resp.data) {
            throw new Error('Invalid response structure');
          }
          // **Transform** sebelum dikirim ke komponen
          return this.transformInvoiceData(resp.data);
        }),
        catchError(err => {
          console.error('InvoiceService.getInvoiceData Error:', err);
          return throwError(() => new Error('Failed to load invoice data'));
        })
      );
  }

  generateInvoice(reservasiId: string | number): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}/invoices/${reservasiId}/generate`,
        {},
        { headers: this.getHeaders() }
      )
      .pipe(catchError(err => this.handleError(err)));
  }

  getQRCode(reservasiId: string | number): Observable<any> {
    return this.http
      .get<{ success: boolean; data: { kode_reservasi: string } }>(
        `${this.apiUrl}/invoices/${reservasiId}/qr-code`,
        { headers: this.getHeaders() }
      )
      .pipe(catchError(err => this.handleError(err)));
  }

  updatePaymentStatus(
    reservasiId: string | number,
    paymentData: any
  ): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}/invoices/${reservasiId}/update-payment`,
        paymentData,
        { headers: this.getHeaders() }
      )
      .pipe(catchError(err => this.handleError(err)));
  }

  getUserInvoices(page = 1, perPage = 10): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/invoices?page=${page}&per_page=${perPage}`, {
        headers: this.getHeaders()
      })
      .pipe(catchError(err => this.handleError(err)));
  }

  resendInvoice(reservasiId: string | number): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}/invoices/${reservasiId}/resend`,
        {},
        { headers: this.getHeaders() }
      )
      .pipe(catchError(err => this.handleError(err)));
  }

  // invoice.service.ts
saveToLocalHistory(data: any) {
  const history = this.getHistory();
  history.unshift(data);
  localStorage.setItem('riwayat', JSON.stringify(history));
}

getHistory(): any[] {
  return JSON.parse(localStorage.getItem('riwayat') || '[]');
}

  verifyAttendance(kodeReservasi: string): Observable<any> {
    // Endpoint ini publik, tapi tetap aman mengirim header
    return this.http
      .post(
        // URL disesuaikan dengan `api.php` yang tidak ada prefix /customer
        `${environment.apiUrl}/customer/verify-attendance/${kodeReservasi}`,
        {},
        { headers: this.getHeaders() }
      )
      .pipe(catchError(err => this.handleError(err)));
  }

  private handleError(error: HttpErrorResponse) {
    let msg = 'Terjadi kesalahan tak terduga';
    if (error.status === 401) {
      msg = 'Tidak terautentikasi. Silakan login ulang.';
    } else if (error.error?.message) {
      msg = error.error.message;
    }
    console.error('InvoiceService Error:', error);
    return throwError(() => new Error(msg));
  }
} 

