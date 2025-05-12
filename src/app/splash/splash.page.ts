// ❌ Hapus bagian kedua ini!
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit {
  showFlash = true;
  showLogo = false;

  constructor(private router: Router) {}

  ngOnInit() {
    setTimeout(() => {
      this.showFlash = false;
      this.showLogo = true;
    }, 1500);

    setTimeout(() => {
      this.router.navigateByUrl('/home', { replaceUrl: true });
    }, 3000);
  }
}
