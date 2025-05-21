import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: false
})
export class MenuPage {
  searchText = '';
  selectedKategori = 'Appetizer';
  cart: any[] = [];

  kategoriList = ['Appetizer', 'Main Course', 'Dessert', 'Beverage'];

  menuList = [
    { nama: 'Risoles', harga: 7000, kategori: 'Appetizer', image: 'assets/img/mayo.jpg', quantity: 0 },
    { nama: 'Salad', harga: 10000, kategori: 'Appetizer', image: 'assets/img/mayo.jpg', quantity: 0 },
    { nama: 'Steak', harga: 25000, kategori: 'Main Course', image: 'assets/img/steak.jpg', quantity: 0 },
    { nama: 'Brownies', harga: 8000, kategori: 'Dessert', image: 'assets/img/brownies.jpg', quantity: 0 },
    { nama: 'Es Teh', harga: 5000, kategori: 'Beverage', image: 'assets/img/esteh.jpg', quantity: 0 }
  ];

  reservasi: any = {
    tanggal: '',
    waktu: '',
    tamu: 0,
    area: '',
    idMeja: '' // ✅ Tambahkan idMeja di sini
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Ambil data reservasi dari queryParams
    this.route.queryParams.subscribe(params => {
      this.reservasi.tanggal = params['tanggal'] || '';
      this.reservasi.waktu = params['waktu'] || '';
      this.reservasi.tamu = Number(params['jumlahTamu']) || 0;
      this.reservasi.area = params['tempat'] || '';
      this.reservasi.idMeja = params['idMeja'] || ''; // ✅ Ambil idMeja
    });
  }

  selectKategori(kategori: string) {
    this.selectedKategori = kategori;
  }

  getFilteredMenu() {
    return this.menuList.filter(item =>
      item.kategori === this.selectedKategori &&
      item.nama.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  addToCart(item: any) {
    const found = this.cart.find(i => i.nama === item.nama);
    if (found) {
      found.quantity++;
    } else {
      const itemCopy = { ...item, quantity: 1 };
      this.cart.push(itemCopy);
    }
    item.quantity++;
  }

  removeFromCart(item: any) {
    const found = this.cart.find(i => i.nama === item.nama);
    if (found && found.quantity > 0) {
      found.quantity--;
      item.quantity--;
      if (found.quantity === 0) {
        this.cart = this.cart.filter(i => i.nama !== item.nama);
      }
    }
  }

  getTotalHarga() {
    return this.cart.reduce((total, item) => total + item.harga * item.quantity, 0);
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

    // Navigasi ke halaman cart dengan cart dan data reservasi
    this.router.navigate(['/cart'], {
      state: {
        cart: this.cart,
        reservasi: this.reservasi // ✅ Sudah termasuk idMeja
      }
    });
  }

  goBack() {
    this.router.navigate(['/reservasi-jadwal']);
  }
}
