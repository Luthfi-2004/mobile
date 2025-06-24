// src/app/services/rating.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RatingData {
  reservasi_id: number;
  rating_makanan: number;
  rating_pelayanan: number;
  rating_aplikasi: number;
  komentar?: string;
}

export interface RatingResponse {
  message: string;
  rating: {
    id: number;
    user_id: number;
    reservasi_id: number;
    rating: number;
    rating_makanan: number;
    rating_pelayanan: number;
    rating_aplikasi: number;
    komentar?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface CheckRatingResponse {
  has_rating: boolean;
  rating?: any;
  can_rate: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private apiUrl = environment.apiUrl;

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

  // Simpan rating ke database
  createRating(data: RatingData): Observable<RatingResponse> {
    return this.http.post<RatingResponse>(
      `${this.apiUrl}/customer/ratings`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // Get semua rating user
  getRatings(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/customer/ratings`,
      { headers: this.getHeaders() }
    );
  }

  // Check apakah reservasi sudah pernah diberi rating
  checkExistingRating(reservasiId: number): Observable<CheckRatingResponse> {
    return this.http.get<CheckRatingResponse>(
      `${this.apiUrl}/customer/ratings/check/${reservasiId}`,
      { headers: this.getHeaders() }
    );
  }
}