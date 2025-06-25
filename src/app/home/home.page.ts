// File: src/app/home/home.page.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../auth.service';
import { MenuService, MenuItem } from '../services/menu.service';
import { ProfileImageService } from '../services/profile-image.service';
import { SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

declare var navigator: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  images = [
    { src: 'assets/img/indoor.jpg', type: 'indoor', text: 'Area Indoor' },
    { src: 'assets/img/outdoor.jpg', type: 'outdoor', text: 'Area Outdoor' },
    { src: 'assets/img/vvip.jpg', type: 'vvip', text: 'Area VVIP' }
  ];
  currentImageIndex = 0;
  unreadNotificationCount = 0;

  // Gambar profil kini dikelola secara reaktif
  profileImage: SafeUrl = 'assets/img/default-profile.jpg';
  private profileImageSubscription!: Subscription;

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
    private toastController: ToastController,
    private profileImageService: ProfileImageService // Service diinjeksi
  ) {
    this.startImageSlider();
    this.setupBackButtonHandler();
  }

  async ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // Logika baru untuk memuat dan mendengarkan perubahan gambar profil
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      // 1. Memuat gambar profil awal saat komponen diinisialisasi
      this.profileImageService.loadCurrentUserProfileImage(currentUser.id);
    }

    // 2. Mendengarkan (subscribe) setiap perubahan pada gambar profil
    this.profileImageSubscription = this.profileImageService.currentProfileImage$.subscribe(image => {
      this.profileImage = image;
    });

    this.loadUnreadNotifications();
    await this.loadMenus();
  }

  async ionViewWillEnter() {
    this.loadUnreadNotifications();
    // Only reload if we don't have data yet
    if (this.bestSellerMenus.length === 0 && this.discountMenus.length === 0) {
      await this.loadMenus();
    }
    // Panggilan ke loadProfileImage() yang lama telah dihapus dari sini
  }

  // Method loadProfileImage() yang lama telah dihapus sepenuhnya

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

  onMenuItemClick(menu: MenuItem) {
    console.log('Menu clicked:', menu);
    this.showToast(`Menu ${menu.name} dipilih`, 'success');
  }

  formatCurrency(amount: number): string {
    return this.menuService.formatCurrency(amount);
  }

  getCategoryDisplayName(category: string): string {
    return this.menuService.getCategoryDisplayName(category);
  }

  trackByMenuId(index: number, menu: MenuItem): number {
    return menu.id;
  }

  async doRefresh(event: any) {
    try {
      await this.loadMenus();
      // Panggilan ke loadProfileImage() yang lama telah dihapus dari sini
      await this.showToast('Menu berhasil diperbarui', 'success');
    } catch (error) {
      await this.showToast('Gagal memperbarui menu', 'danger');
    } finally {
      event.target.complete();
    }
  }

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

  ngOnDestroy() {
    // Hentikan subscription saat komponen dihancurkan untuk mencegah memory leak
    if (this.profileImageSubscription) {
      this.profileImageSubscription.unsubscribe();
    }
  }
}