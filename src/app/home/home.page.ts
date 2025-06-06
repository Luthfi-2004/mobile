// File: src/app/home/home.page.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../auth.service';
import { MenuService, MenuItem } from '../services/menu.service';

declare var navigator: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  images = [
    { src: 'assets/img/indoor.jpg', type: 'indoor', text: 'Area Indoor' },
    { src: 'assets/img/outdoor.jpg', type: 'outdoor', text: 'Area Outdoor' },
    { src: 'assets/img/vvip.jpg', type: 'vvip', text: 'Area VVIP' }
  ];
  currentImageIndex = 0;
  unreadNotificationCount = 0;

  // --- Start: Penambahan untuk Gambar Profil Dinamis ---
  profileImage: string = 'assets/img/default-profile.jpg'; // Default image, harus sama dengan di info-akun.page.ts
  // --- End: Penambahan untuk Gambar Profil Dinamis ---

  // Dynamic menu data
  bestSellerMenus: MenuItem[] = [];
  discountMenus: MenuItem[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private alertController: AlertController,
    private authService: AuthService,
    private platform: Platform,
    private menuService: MenuService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.startImageSlider();
    this.setupBackButtonHandler();
  }

  async ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUnreadNotifications();
    await this.loadMenus();
    // --- Start: Pemanggilan loadProfileImage saat ngOnInit ---
    this.loadProfileImage();
    // --- End: Pemanggilan loadProfileImage saat ngOnInit ---
  }

  async ionViewWillEnter() {
    this.loadUnreadNotifications();
    // Only reload if we don't have data yet
    if (this.bestSellerMenus.length === 0 && this.discountMenus.length === 0) {
      await this.loadMenus();
    }
    // --- Start: Pemanggilan loadProfileImage saat ionViewWillEnter agar selalu update ---
    this.loadProfileImage();
    // --- End: Pemanggilan loadProfileImage saat ionViewWillEnter agar selalu update ---
  }

  // --- Start: Method baru untuk memuat gambar profil ---
  loadProfileImage() {
    const storedProfileImage = localStorage.getItem('profileImage');
    if (storedProfileImage) {
      this.profileImage = storedProfileImage;
    } else {
      // Jika tidak ada di localStorage, coba ambil dari userData jika ada
      const loggedUserDataString = localStorage.getItem('userData');
      if (loggedUserDataString) {
        const loggedUserData = JSON.parse(loggedUserDataString);
        if (loggedUserData.profileImage) {
          this.profileImage = loggedUserData.profileImage;
          localStorage.setItem('profileImage', loggedUserData.profileImage); // Simpan juga ke profileImage terpisah
        }
      }
    }
  }
  // --- End: Method baru untuk memuat gambar profil ---

  private setupBackButtonHandler() {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      const alert = await this.alertController.create({
        header: 'Konfirmasi',
        message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
        buttons: [
          { text: 'Batal', role: 'cancel' },
          {
            text: 'Keluar',
            handler: () => {
              if (this.platform.is('android')) {
                navigator.app.exitApp();
              }
            }
          }
        ]
      });
      await alert.present();
    });
  }

  async loadMenus() {
    this.isLoading = true;
    this.errorMessage = '';

    const loading = await this.loadingController.create({
      message: 'Memuat menu...',
      duration: 15000 // 15 seconds timeout
    });
    await loading.present();

    try {
      // Load all available menus
      const response = await this.menuService.getMenus().toPromise();
      
      if (response && response.menus && response.menus.data) {
        const allMenus: MenuItem[] = response.menus.data;
        
        // Filter and process best seller menus
        this.processBestSellerMenus(allMenus);
        
        // Filter and process discount menus
        this.processDiscountMenus(allMenus);

        console.log('Best Seller Menus:', this.bestSellerMenus);
        console.log('Discount Menus:', this.discountMenus);
        
      } else {
        this.errorMessage = 'Tidak ada data menu yang tersedia';
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      this.errorMessage = typeof error === 'string' ? error : 'Gagal memuat menu. Silakan coba lagi.';
      await this.showToast(this.errorMessage, 'danger');
    } finally {
      this.isLoading = false;
      loading.dismiss();
    }
  }

  private processBestSellerMenus(allMenus: MenuItem[]) {
    // Take first 3 available food items as best sellers
    // You can modify this logic based on your business requirements
    this.bestSellerMenus = allMenus
      .filter(menu => menu.is_available)
      .filter(menu => menu.category === 'food')  // Prioritize food items
      .slice(0, 3);

    // If we don't have enough food items, add other categories
    if (this.bestSellerMenus.length < 3) {
      const remainingSlots = 3 - this.bestSellerMenus.length;
      const otherMenus = allMenus
        .filter(menu => menu.is_available)
        .filter(menu => menu.category !== 'food')
        .slice(0, remainingSlots);
      
      this.bestSellerMenus = [...this.bestSellerMenus, ...otherMenus];
    }
  }

  private processDiscountMenus(allMenus: MenuItem[]) {
    // Filter items with actual discounts
    this.discountMenus = allMenus
      .filter(menu => menu.is_available)
      .filter(menu => menu.discount_percentage && menu.discount_percentage > 0)
      .slice(0, 3);

    // If no items have discounts, create mock discount for demo purposes
    if (this.discountMenus.length === 0) {
      this.discountMenus = allMenus
        .filter(menu => menu.is_available)
        .slice(3, 6) // Take different items from best sellers
        .map(menu => ({
          ...menu,
          discount_percentage: 15, // Mock 15% discount
          discounted_price: Math.round(menu.price * 0.85),
          final_price: Math.round(menu.price * 0.85)
        }));
    }
  }

  loadUnreadNotifications() {
    try {
      const notifikasi = JSON.parse(localStorage.getItem('notifikasiList') || '[]');
      this.unreadNotificationCount = notifikasi.filter((n: any) => !n.read).length;
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.unreadNotificationCount = 0;
    }
  }

  markNotificationsAsRead() {
    try {
      const notifikasi = JSON.parse(localStorage.getItem('notifikasiList') || '[]');
      const updated = notifikasi.map((n: any) => ({ ...n, read: true }));
      localStorage.setItem('notifikasiList', JSON.stringify(updated));
      this.unreadNotificationCount = 0;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  goToNotifikasi() {
    this.markNotificationsAsRead();
    this.router.navigate(['/notifikasi']);
  }

  startImageSlider() {
    setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }, 4000);
  }

  goToReservasi() {
    this.router.navigate(['/reservasi']);
  }

  // Method to handle menu item click
  onMenuItemClick(menu: MenuItem) {
    console.log('Menu clicked:', menu);
    // You can navigate to menu detail page or add to cart
    // Example: this.router.navigate(['/menu-detail', menu.id]);
    
    // For now, show a simple toast
    this.showToast(`Menu ${menu.name} dipilih`, 'success');
  }

  // Helper method to format currency
  formatCurrency(amount: number): string {
    return this.menuService.formatCurrency(amount);
  }

  // Helper method to get category display name
  getCategoryDisplayName(category: string): string {
    return this.menuService.getCategoryDisplayName(category);
  }

  // TrackBy function for ngFor performance
  trackByMenuId(index: number, menu: MenuItem): number {
    return menu.id;
  }

  // Refresh method for pull-to-refresh
  async doRefresh(event: any) {
    try {
      await this.loadMenus();
      // --- Start: Pemanggilan loadProfileImage saat refresh ---
      this.loadProfileImage();
      // --- End: Pemanggilan loadProfileImage saat refresh ---
      await this.showToast('Menu berhasil diperbarui', 'success');
    } catch (error) {
      await this.showToast('Gagal memperbarui menu', 'danger');
    } finally {
      event.target.complete();
    }
  }

  // Retry loading menus
  async retryLoadMenus() {
    await this.loadMenus();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  async handleInvoiceClick() {
    try {
      const riwayat = JSON.parse(localStorage.getItem('riwayat') || '[]');
      if (riwayat.length === 0) {
        const alert = await this.alertController.create({
          header: 'Belum Ada Invoice',
          message: 'Anda belum melakukan pemesanan atau transaksi apapun.',
          buttons: ['OK']
        });
        await alert.present();
      } else {
        const transaksiTerakhir = riwayat[riwayat.length - 1];
        this.router.navigate(['/invoice'], { state: { transaksi: transaksiTerakhir } });
      }
    } catch (error) {
      console.error('Error handling invoice click:', error);
      await this.showToast('Gagal mengakses invoice', 'danger');
    }
  }
}