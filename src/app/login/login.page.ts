import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  showPassword = false;
  email = '';
  password = '';
  
  constructor(private router: Router) {}

  goToHome() {
    this.router.navigate(['/home']);
  }
  togglePassword() {
    this.showPassword = !this.showPassword;
  }
  onLogin() {
    if (!this.email || !this.password) {
      console.warn('Email dan password wajib diisi');
      return;
    }

    console.log('Authenticating:', this.email);
   
  }
}