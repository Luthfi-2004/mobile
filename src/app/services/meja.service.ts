import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Table {
  id: string;
  full: boolean;
  seats: number;
  selected?: boolean;
  status: string;
  database_id: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AvailabilityCheck {
  available: boolean;
  unavailable_tables: Array<{
    table_id: string;
    reason: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class MejaService {
  private apiUrl = `${environment.apiUrl}/customer`;

  constructor(private http: HttpClient) {}

  getTables(): Observable<ApiResponse<Record<string, Table[]>>> {
    return this.http.get<ApiResponse<Record<string, Table[]>>>(`${this.apiUrl}/tables`);
  }

  getAreas(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/tables/areas`);
  }

  checkAvailability(tableIds: string[], date: string, time: string): Observable<ApiResponse<AvailabilityCheck>> {
    return this.http.post<ApiResponse<AvailabilityCheck>>(`${this.apiUrl}/tables/check-availability`, {
      table_ids: tableIds,
      date,
      time
    });
  }
}