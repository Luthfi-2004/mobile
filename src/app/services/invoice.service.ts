// src/app/services/invoice.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'http://127.0.0.1:8000/api/customer';

  constructor(private http: HttpClient) { }

  /**
   * Get invoice data untuk reservasi tertentu
   * @param reservasiId - ID dari reservasi
   * @returns Observable dengan data invoice
   */
  getInvoiceData(reservasiId: string | number): Observable<any> {
    const headers = this.getHeaders();
    
    return this.http.get(`${this.apiUrl}/invoices/${reservasiId}`, { headers })
      .pipe(
        map((response: any) => {
          if (response.success && response.data) {
            return this.transformInvoiceData(response.data);
          }
          throw new Error(response.message || 'Gagal mengambil data invoice');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Generate invoice untuk reservasi
   * @param reservasiId - ID reservasi
   * @returns Observable dengan response
   */
  generateInvoice(reservasiId: string | number): Observable<any> {
    const headers = this.getHeaders();
    
    return this.http.post(`${this.apiUrl}/invoices/${reservasiId}/generate`, {}, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get QR Code untuk reservasi
   * @param reservasiId - ID reservasi
   * @returns Observable dengan QR code data
   */
  getQRCode(reservasiId: string | number): Observable<any> {
    const headers = this.getHeaders();
    
    return this.http.get(`${this.apiUrl}/invoices/${reservasiId}/qr`, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Update payment status
   * @param reservasiId - ID reservasi
   * @param paymentData - Data pembayaran
   * @returns Observable dengan response
   */
  updatePaymentStatus(reservasiId: string | number, paymentData: any): Observable<any> {
    const headers = this.getHeaders();
    
    return this.http.put(`${this.apiUrl}/invoices/${reservasiId}/payment`, paymentData, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get daftar semua invoice user
   * @param page - Halaman
   * @param perPage - Jumlah per halaman
   * @returns Observable dengan daftar invoice
   */
  getUserInvoices(page: number = 1, perPage: number = 10): Observable<any> {
    const headers = this.getHeaders();
    
    return this.http.get(`${this.apiUrl}/invoices?page=${page}&per_page=${perPage}`, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Resend invoice
   * @param reservasiId - ID reservasi
   * @returns Observable dengan response
   */
  resendInvoice(reservasiId: string | number): Observable<any> {
    const headers = this.getHeaders();
    
    return this.http.post(`${this.apiUrl}/invoices/${reservasiId}/resend`, {}, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Verify attendance menggunakan kode reservasi
   * @param kodeReservasi - Kode reservasi
   * @returns Observable dengan response
   */
  verifyAttendance(kodeReservasi: string): Observable<any> {
    const headers = this.getHeaders();
    
    return this.http.post(`${this.apiUrl}/verify-attendance/${kodeReservasi}`, {}, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get headers untuk request API
   * @returns HttpHeaders
   */
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    // Ambil token dari localStorage (sesuai dengan implementasi di component)
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Transform data invoice dari Laravel sesuai kebutuhan frontend
   * @param data - Raw data dari Laravel API
   * @returns Transformed data
   */
  private transformInvoiceData(data: any): any {
    // Struktur data yang dikembalikan dari Laravel InvoiceService::generateInvoice()
    // adalah Invoice model dengan relasi reservasi
    
    const invoice = data;
    const reservasi = data.reservasi || {};
    const orders = reservasi.orders || [];
    const user = reservasi.pengguna || reservasi.user || {};
    const meja = reservasi.meja || [];

    return {
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        subtotal: invoice.subtotal,
        service_fee: invoice.service_fee,
        total_amount: invoice.total_amount,
        amount_paid: invoice.amount_paid,
        remaining_amount: invoice.remaining_amount,
        payment_method: invoice.payment_method,
        payment_status: invoice.payment_status,
        qr_code: invoice.qr_code,
        generated_at: invoice.generated_at,
        created_at: invoice.created_at,
        updated_at: invoice.updated_at
      },
      reservasi: {
        id: reservasi.id,
        kode_reservasi: reservasi.kode_reservasi,
        nama_pelanggan: reservasi.nama_pelanggan,
        waktu_kedatangan: reservasi.waktu_kedatangan,
        jumlah_tamu: reservasi.jumlah_tamu,
        status: reservasi.status,
        status_kehadiran: reservasi.status_kehadiran,
        catatan: reservasi.catatan,
        meja: Array.isArray(meja) ? meja : [meja].filter(Boolean)
      },
      customer: {
        id: user.id,
        nama_pelanggan: user.name || reservasi.nama_pelanggan,
        email: user.email,
        telp: user.phone || user.telp
      },
      items: orders.map((order: any) => ({
        id: order.id,
        nama: order.menu?.nama || order.nama_menu,
        quantity: order.quantity,
        price: order.price,
        total_price: order.price * order.quantity,
        note: order.note || order.catatan,
        menu: order.menu
      }))
    };
  }

  /**
   * Handle HTTP errors
   * @param error - HttpErrorResponse
   * @returns Observable error
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Terjadi kesalahan yang tidak diketahui';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        switch (error.status) {
          case 400:
            errorMessage = 'Request tidak valid';
            break;
          case 401:
            errorMessage = 'Tidak terautentikasi. Silakan login kembali.';
            // Optional: Redirect to login
            // this.router.navigate(['/login']);
            break;
          case 403:
            errorMessage = 'Tidak memiliki akses untuk resource ini';
            break;
          case 404:
            errorMessage = 'Data tidak ditemukan';
            break;
          case 422:
            errorMessage = 'Data tidak valid';
            break;
          case 500:
            errorMessage = 'Terjadi kesalahan server. Silakan coba lagi nanti.';
            break;
          default:
            errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
        }
      }
    }
    
    console.error('Invoice Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}