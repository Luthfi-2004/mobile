import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { MenuService, MenuItem, MenuResponse } from '../services/menu.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: false
})
export class MenuPage implements OnInit {
  searchText = '';
  selectedKategori = 'all';
  cart: any[] = [];

  // Dynamic data from API
  menuList: MenuItem[] = [];
  kategoriList: { value: string, label: string }[] = [];
  kategoriListWithAll: { value: string, label: string }[] = [];

  // Loading states
  isLoading = false;
  currentPage = 1;
  totalPages = 1;
  hasMoreData = true;

  reservasi: any = {
    tanggal: '',
    waktu: '',
    tamu: 0,
    area: '',
    idMeja: ''
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private menuService: MenuService
  ) {}

  async ngOnInit() {
    // Get categories from service
    this.kategoriList = this.menuService.getCategories();
    this.kategoriListWithAll = [
      { value: 'all', label: 'Semua' },
      ...this.kategoriList
    ];

    // Get reservation data from queryParams
    this.route.queryParams.subscribe(params => {
      this.reservasi.tanggal = params['tanggal'] || '';
      this.reservasi.waktu = params['waktu'] || '';
      this.reservasi.tamu = Number(params['jumlahTamu']) || 0;
      this.reservasi.area = params['tempat'] || '';
      this.reservasi.idMeja = params['idMeja'] || '';
    });

    // Load initial menu data
    await this.loadMenus();
  }

  async loadMenus(refresh: boolean = false) {
    if (refresh) {
      this.currentPage = 1;
      this.menuList = [];
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Memuat menu...'
    });
    await loading.present();

    try {
      const category = this.selectedKategori === 'all' ? undefined : this.selectedKategori;
      const search = this.searchText.trim() || undefined;

      const response = await this.menuService.getMenus(category, search, this.currentPage).toPromise();

      if (response && response.menus) {
        if (refresh) {
          this.menuList = response.menus.data;
        } else {
          this.menuList = [...this.menuList, ...response.menus.data];
        }

        // Add quantity property for cart management
        this.menuList.forEach(menu => {
          if (!menu.hasOwnProperty('quantity')) {
            (menu as any).quantity = 0;
          }
        });

        this.totalPages = response.menus.last_page;
        this.hasMoreData = this.currentPage < this.totalPages;
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      await this.showToast('Gagal memuat menu: ' + error, 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  async selectKategori(kategori: string) {
    this.selectedKategori = kategori;
    await this.loadMenus(true);
  }

  async onSearchChange() {
    // Debounce search
    setTimeout(async () => {
      await this.loadMenus(true);
    }, 500);
  }

  getFilteredMenu(): MenuItem[] {
    // Since we're filtering on the server side, return all loaded menus
    return this.menuList;
  }

  addToCart(item: MenuItem) {
    const found = this.cart.find(i => i.id === item.id);
    if (found) {
      found.quantity++;
    } else {
      const itemCopy = { 
        ...item, 
        quantity: 1,
        // Use final_price if available, otherwise use discounted_price or price
        finalPrice: item.final_price || item.discounted_price || item.price
      };
      this.cart.push(itemCopy);
    }

    // Update menu item quantity for display
    const menuItem = this.menuList.find(m => m.id === item.id);
    if (menuItem) {
      (menuItem as any).quantity = ((menuItem as any).quantity || 0) + 1;
    }
  }

  removeFromCart(item: MenuItem) {
    const found = this.cart.find(i => i.id === item.id);
    if (found && found.quantity > 0) {
      found.quantity--;

      // Update menu item quantity for display
      const menuItem = this.menuList.find(m => m.id === item.id);
      if (menuItem) {
        (menuItem as any).quantity = Math.max(0, ((menuItem as any).quantity || 0) - 1);
      }

      if (found.quantity === 0) {
        this.cart = this.cart.filter(i => i.id !== item.id);
      }
    }
  }

  getTotalHarga(): number {
    return this.cart.reduce((total, item) => {
      const price = item.finalPrice || item.discounted_price || item.price;
      return total + (price * item.quantity);
    }, 0);
  }

  getItemQuantity(item: MenuItem): number {
    const cartItem = this.cart.find(i => i.id === item.id);
    return cartItem ? cartItem.quantity : 0;
  }

  async goToCart() {
    if (this.cart.length === 0) {
      const alert = await this.alertController.create({
        header: 'Keranjang Kosong',
        message: 'Silakan pilih minimal satu menu sebelum melanjutkan ke checkout.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Navigate to cart page with cart and reservation data
    this.router.navigate(['/cart'], {
      state: {
        cart: this.cart,
        reservasi: this.reservasi
      }
    });
  }

  async loadMoreMenus() {
    if (!this.hasMoreData || this.isLoading) {
      return;
    }

    this.currentPage++;
    await this.loadMenus(false);
  }

  async doRefresh(event: any) {
    await this.loadMenus(true);
    event.target.complete();
  }

  formatCurrency(amount: number): string {
    return this.menuService.formatCurrency(amount);
  }

  getCategoryDisplayName(category: string): string {
    return this.menuService.getCategoryDisplayName(category);
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/reservasi-jadwal']);
  }

  /**
   * Fungsi trackBy untuk *ngFor agar performa lebih baik
   */
  trackByMenuId(index: number, item: any): any {
    return item.id || index;
  }

  /**
   * Handler ketika gambar gagal dimuat, mengganti ke gambar default
   */
  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = 'assets/img/default-food.png';
    }
  }
}
