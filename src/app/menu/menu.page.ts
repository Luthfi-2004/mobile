import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { MenuService, MenuItem } from '../services/menu.service';
import { ReservationService } from '../services/reservation.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: false
})
export class MenuPage implements OnDestroy {
  searchText = '';
  selectedKategori = 'all';
  cart: any[] = [];

  menuList: MenuItem[] = [];
  kategoriList: { value: string, label: string }[] = [];
  kategoriListWithAll: { value: string, label: string }[] = [];

  isLoading = false;
  currentPage = 1;
  totalPages = 1;
  hasMoreData = true;

  reservasi: any = {};
  navigatedToCart = false;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private menuService: MenuService,
    private reservationService: ReservationService
  ) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['reservasi']) {
      this.reservasi = nav.extras.state['reservasi'];
      console.log('Data reservasi valid diterima di MenuPage:', this.reservasi);
    } else {
      this.showToast('Sesi reservasi tidak ditemukan, silakan mulai dari awal.', 'warning');
      this.router.navigate(['/reservasi-jadwal']);
    }
  }

  async ngOnInit() {
    this.kategoriList = this.menuService.getCategories();
    this.kategoriListWithAll = [
      { value: 'all', label: 'Semua' },
      ...this.kategoriList
    ];
    await this.loadMenus();
  }

  ionViewWillLeave() {
    if (!this.navigatedToCart && this.reservasi?.id && this.reservasi.status === 'pending_payment') {
      console.log('Membatalkan reservasi status pending_payment:', this.reservasi.id);
      this.cancelReservation(this.reservasi.id);
    }
  }

  ngOnDestroy() {}

  private async cancelReservation(reservasiId: number) {
    const loading = await this.loadingController.create({
      message: 'Membatalkan reservasi...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await this.reservationService.autoCancelReservasi(reservasiId).toPromise();
      const message = response?.message || 'Reservasi dibatalkan.';
      await this.showToast(message, 'warning');
      console.log('Reservasi dibatalkan otomatis:', response);
    } catch (error: any) {
      console.error('Gagal membatalkan reservasi otomatis:', error);
      const message = error?.error?.message || 'Terjadi kesalahan saat membatalkan reservasi.';
      await this.showToast(message, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async loadMenus(refresh: boolean = false) {
    if (refresh) {
      this.currentPage = 1;
      this.menuList = [];
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({ message: 'Memuat menu...' });
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
      await this.showToast('Gagal memuat menu.', 'danger');
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
    setTimeout(async () => {
      await this.loadMenus(true);
    }, 500);
  }

  addToCart(item: MenuItem) {
    const found = this.cart.find(i => i.id === item.id);
    if (found) {
      found.quantity++;
    } else {
      const itemCopy = {
        ...item,
        quantity: 1,
        finalPrice: item.final_price || item.discounted_price || item.price
      };
      this.cart.push(itemCopy);
    }

    const menuItem = this.menuList.find(m => m.id === item.id);
    if (menuItem) {
      (menuItem as any).quantity = ((menuItem as any).quantity || 0) + 1;
    }
  }

  removeFromCart(item: MenuItem) {
    const found = this.cart.find(i => i.id === item.id);
    if (found && found.quantity > 0) {
      found.quantity--;
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
    const alert = await this.alertController.create({
      header: 'Konfirmasi Checkout',
      message: 'Apakah Anda yakin ingin melanjutkan ke pembayaran? 5 menit tidak di bayarkan akan otomatis cancel.',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Lanjutkan',
          handler: async () => {
            if (this.cart.length === 0) {
              await this.showToast('Keranjang masih kosong.', 'warning');
              return;
            }

            if (!this.reservasi || !this.reservasi.id) {
              await this.showToast('Informasi reservasi tidak ditemukan.', 'danger');
              this.router.navigate(['/reservasi-jadwal']);
              return;
            }

            const token = localStorage.getItem('auth_token');
            if (!token) {
              await this.showToast('Sesi login Anda telah habis.', 'danger');
              this.router.navigate(['/login']);
              return;
            }

            this.navigatedToCart = true;

            this.router.navigate(['/cart'], {
              state: {
                cart: this.cart,
                reservasi: this.reservasi
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  async loadMoreMenus() {
    if (!this.hasMoreData || this.isLoading) return;
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
      position: 'bottom',
      mode: 'ios',
      cssClass: color === 'danger' ? 'toast-error' : ''
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/reservasi-jadwal']);
  }

  trackByMenuId(index: number, item: any): any {
    return item.id || index;
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = 'assets/img/default-food.png';
    }
  }
}