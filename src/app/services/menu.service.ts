// File: src/app/services/menu.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  discount_percentage: number;
  discounted_price: number;
  image: string;
  category: string;
  is_available: boolean;
  preparation_time: number;
  created_at: string;
  updated_at: string;
  image_url?: string;
  final_price?: number;
}

export interface MenuResponse {
  message: string;
  menus: {
    data: MenuItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface MenuDetailResponse {
  message: string;
  menu: MenuItem;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = `${environment.apiUrl}/customer/menus`;

  constructor(private http: HttpClient) { }

  /**
   * Get all available menus with optional filters
   */
  getMenus(category?: string, search?: string, page: number = 1): Observable<MenuResponse> {
    let params = new HttpParams();
    
    if (category) {
      params = params.set('category', category);
    }
    
    if (search) {
      params = params.set('search', search);
    }
    
    params = params.set('page', page.toString());

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.get<MenuResponse>(this.apiUrl, { 
      params, 
      headers 
    }).pipe(
      map((response: MenuResponse) => {
        // Process image URLs for each menu item
        if (response.menus && response.menus.data) {
          response.menus.data = response.menus.data.map(menu => ({
            ...menu,
            image_url: this.getImageUrl(menu.image),
            final_price: menu.discounted_price || menu.price
          }));
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get menu by ID
   */
  getMenuById(id: number): Observable<MenuDetailResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.get<MenuDetailResponse>(`${this.apiUrl}/${id}`, { headers }).pipe(
      map((response: MenuDetailResponse) => {
        // Process image URL for the menu item
        if (response.menu) {
          response.menu.image_url = this.getImageUrl(response.menu.image);
          response.menu.final_price = response.menu.discounted_price || response.menu.price;
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get menus by category
   */
  getMenusByCategory(category: string, page: number = 1): Observable<MenuResponse> {
    return this.getMenus(category, undefined, page);
  }

  /**
   * Search menus by name or description
   */
  searchMenus(searchTerm: string, page: number = 1): Observable<MenuResponse> {
    return this.getMenus(undefined, searchTerm, page);
  }

  /**
   * Get available categories
   */
  getCategories(): { value: string, label: string }[] {
    return [
      { value: 'food', label: 'Makanan' },
      { value: 'beverage', label: 'Minuman' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'appetizer', label: 'Appetizer' },
      { value: 'other', label: 'Lainnya' }
    ];
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'food': 'Makanan',
      'beverage': 'Minuman', 
      'dessert': 'Dessert',
      'appetizer': 'Appetizer',
      'other': 'Lainnya'
    };
    return categoryMap[category] || category;
  }

  /**
   * Get full image URL
   */
  private getImageUrl(imagePath: string): string {
    if (!imagePath) {
      return 'assets/img/default-food.png';
    }
    
    // If image path already contains full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Construct full URL from Laravel storage path
    return `${environment.baseUrl}/storage/${imagePath}`;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Terjadi kesalahan saat mengambil data menu';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
          break;
        case 404:
          errorMessage = 'Menu tidak ditemukan.';
          break;
        case 500:
          errorMessage = 'Terjadi kesalahan pada server.';
          break;
        default:
          errorMessage = error.error?.message || `Error Code: ${error.status}`;
      }
    }
    
    console.error('MenuService Error:', error);
    return throwError(errorMessage);
  }

  /**
   * Format currency to Indonesian Rupiah
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}