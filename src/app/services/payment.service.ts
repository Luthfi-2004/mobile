// src/app/services/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/customer`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  processCheckout(payload: any): Observable<any> {
    // Gunakan authenticatedRequest dari AuthService yang sudah ada
    // Endpoint ini harus sesuai dengan yang ada di api.php
    return this.authService.authenticatedRequest('POST', '/customer/checkout', payload);
  }
}