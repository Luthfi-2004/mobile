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

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = `${environment.apiUrl}/customer/menus`;

  constructor(private http: HttpClient) { }

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

    return this.http.get<MenuResponse>(this.apiUrl, { params, headers }).pipe(
      map((response: MenuResponse) => {
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

  getMenuById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getCategories(): { value: string, label: string }[] {
    return [
      { value: 'food', label: 'Makanan' },
      { value: 'beverage', label: 'Minuman' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'appetizer', label: 'Appetizer' },
      { value: 'other', label: 'Lainnya' }
    ];
  }

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

  private getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/img/default-food.png';
    if (imagePath.startsWith('http')) return imagePath;
    return `${environment.baseUrl}/storage/${imagePath}`;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Terjadi kesalahan saat mengambil data menu';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'Tidak dapat terhubung ke server.';
          break;
        case 404:
          errorMessage = 'Data tidak ditemukan.';
          break;
        case 500:
          errorMessage = 'Terjadi kesalahan server.';
          break;
        default:
          errorMessage = error.error?.message || `Error Code: ${error.status}`;
      }
    }
    console.error('MenuService Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
