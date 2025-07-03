import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit {
  showFlash = true;
  showLogo = false;
  fadeOut = false;

  constructor(
    private router: Router,
    private platform: Platform
  ) {}

  ngOnInit() {
    // Tunggu platform siap
    this.platform.ready().then(() => {
      // Tampilkan logo setelah flash background mulai
      setTimeout(() => {
        this.showLogo = true;
      }, 800); // Timing yang lebih smooth

      // Mulai fade out sebelum navigasi
      setTimeout(() => {
        this.fadeOut = true;
      }, 4000); // 4 detik total

      // Navigasi ke halaman login setelah fade out selesai
      setTimeout(() => {
        this.router.navigateByUrl('login', { replaceUrl: true });
      }, 5000); // 4s + 1s fade out
    });
  }
}