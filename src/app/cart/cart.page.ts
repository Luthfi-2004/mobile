import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false
})
export class CartPage {
  cart: any[] = [];

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['cart']) {
      this.cart = nav.extras.state['cart'];
    }
  }

  getTotalHarga() {
    return this.cart.reduce((total, item) => total + item.harga * item.quantity, 0);
  }

  checkout() {
    // Logika submit reservasi ke backend bisa di sini
    alert('Pesanan Anda berhasil dikirim!');
    this.router.navigate(['/menu']);
  }

  goBack() {
    this.router.navigate(['/menu']);
  }
}
