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

  constructor(
    private router: Router,
    private platform: Platform
  ) {}

  ngOnInit() {
    // Tunggu platform siap
    this.platform.ready().then(() => {
      setTimeout(() => {
        this.showFlash = false;
        this.showLogo = true;
      }, 1500);  

      setTimeout(() => {
        this.router.navigateByUrl('login', { replaceUrl: true });
      }, 3000);  
    });
  }
}
