import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  email = '';
  password = '';

  onLogin() {
    console.log('Login dengan:', this.email, this.password);
    // Tambahkan logika autentikasi di sini
  }
}
