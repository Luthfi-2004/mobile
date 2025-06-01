import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  showPassword = false;
  emailOrUsername = '';  // bisa email, username, atau nomor telepon
  password = '';

  constructor(
    private router: Router,
    private alertController: AlertController
  ) {}

  goToHome() {
    localStorage.setItem('isLoggedIn', 'true');
    this.router.navigate(['/tabs/home']);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // Method alert agar kode lebih rapi
  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async onLogin() {
    if (!this.emailOrUsername || !this.password) {
      await this.showAlert('Login Gagal', 'Email/Username/No Telp dan password wajib diisi');
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Cari user berdasarkan email, username, atau nomor telepon + password
    const user = users.find((u: any) =>
      (u.email === this.emailOrUsername ||
       u.username === this.emailOrUsername ||
       u.telp === this.emailOrUsername) &&
       u.password === this.password
    );

    if (user) {
      localStorage.setItem('userData', JSON.stringify({
        email: user.email,
        username: user.username,
        loggedIn: true
      }));

      await this.showAlert('Login Berhasil', 'Anda akan diarahkan ke halaman utama');
      this.goToHome();
    } else {
      await this.showAlert('Login Gagal', 'Email/Username/No Telp atau password tidak valid');
    }
  }

  async loginWithGoogle() {
    try {
      console.log('Login with Google clicked');

      localStorage.setItem('userData', JSON.stringify({
        email: 'google_user@example.com',
        loggedIn: true,
        provider: 'google'
      }));

      await this.showAlert('Login Berhasil', 'Anda login menggunakan Google');
      this.goToHome();
    } catch (error) {
      console.error('Google login error:', error);
      await this.showAlert('Login Gagal', 'Terjadi kesalahan saat login dengan Google');
    }
  }
}
