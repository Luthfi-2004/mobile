import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  images: string[] = [
    'assets/img/makan.jpg',
    'assets/img/makan2.jpg',
    'assets/img/makan3.jpg'
  ];
  currentImageIndex = 0;

  constructor(
    private navCtrl: NavController,
    private router: Router
  ) {
    this.startImageSlider();
  }

  startImageSlider() {
    setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }, 4000);
  }
  goToReservasi() {
    this.router.navigate(['/reservasi']);
  }
}
