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
  serviceFee: number = 9000;
  paymentMethod: string = 'qris';

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['cart']) {
      this.cart = nav.extras.state['cart'].map((item: any) => ({
        ...item,
        quantity: item.quantity || 1,
      }));
    }
  }

  get subtotal(): number {
    return this.cart.reduce((total, item) => total + item.harga * item.quantity, 0);
  }

  get total(): number {
    return this.subtotal + this.serviceFee;
  }

  increaseQty(index: number) {
    this.cart[index].quantity += 1;
    this.updateTotals();
  }

  decreaseQty(index: number) {
    if (this.cart[index].quantity > 1) {
      this.cart[index].quantity -= 1;
      this.updateTotals();
    }
  }

  editItem(index: number) {
    const currentQty = this.cart[index].quantity;
    const newQty = prompt(`Ubah jumlah untuk ${this.cart[index].nama}:`, currentQty.toString());
    const parsedQty = parseInt(newQty || '', 10);

    if (!isNaN(parsedQty) && parsedQty >= 0) {
      this.cart[index].quantity = parsedQty;
      if (parsedQty === 0) {
        this.cart.splice(index, 1);
      }
      this.updateTotals();
    }
  }

  deleteItem(index: number) {
    const confirmDelete = confirm(`Yakin ingin menghapus ${this.cart[index].nama} dari pesanan?`);
    if (confirmDelete) {
      this.cart.splice(index, 1);
      this.updateTotals();
    }
  }

  selectPayment(method: string) {
    this.paymentMethod = method;
  }

  checkout() {
    if (!this.paymentMethod) {
      alert('Silakan pilih metode pembayaran terlebih dahulu.');
      return;
    }

    if (this.cart.length === 0) {
      alert('Keranjang kosong!');
      return;
    }

    const transaksi = {
      id: Date.now(),
      tanggal: new Date().toLocaleString(),
      items: [...this.cart],
      total: this.total,
      status: 'Selesai',
      metode: this.paymentMethod,
    };

    const existing = JSON.parse(localStorage.getItem('riwayat') || '[]');
    existing.push(transaksi);
    localStorage.setItem('riwayat', JSON.stringify(existing));

    alert(`Pesanan berhasil dikirim!\nMetode Pembayaran: ${this.paymentMethod}\nTotal: Rp${this.total.toLocaleString()}`);
    this.cart = [];
    this.router.navigate(['/riwayat']);
  }

  updateTotals() {
    // Getter sudah otomatis menghitung ulang
  }

  goBack() {
    this.router.navigate(['/menu']);
  }
}
