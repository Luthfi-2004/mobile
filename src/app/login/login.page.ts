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
  email = '';
  password = '';
  
  constructor(
    private router: Router,
    private alertController: AlertController
  ) {}

  goToHome() {
    // Simpan status login di localStorage
    localStorage.setItem('isLoggedIn', 'true');
    this.router.navigate(['/tabs/home']);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onLogin() {
    if (!this.email || !this.password) {
      const alert = await this.alertController.create({
        header: 'Login Gagal',
        message: 'Email dan password wajib diisi',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Validasi sederhana - bisa disesuaikan
    if (this.email.includes('@') && this.password.length >= 6) {
      // Simpan data user sederhana di localStorage
      localStorage.setItem('userData', JSON.stringify({
        email: this.email,
        loggedIn: true
      }));
      
      const alert = await this.alertController.create({
        header: 'Login Berhasil',
        message: 'Anda akan diarahkan ke halaman utama',
        buttons: ['OK']
      });
      await alert.present();
      
      this.goToHome();
    } else {
      const alert = await this.alertController.create({
        header: 'Login Gagal',
        message: 'Email atau password tidak valid',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  // Fungsi untuk login Google
  async loginWithGoogle() {
    try {
      // Simulasi login Google berhasil
      console.log('Login with Google clicked');
      
      // Simpan data user sederhana di localStorage
      localStorage.setItem('userData', JSON.stringify({
        email: 'google_user@example.com',
        loggedIn: true,
        provider: 'google'
      }));
      
      // Tampilkan alert sukses
      const alert = await this.alertController.create({
        header: 'Login Berhasil',
        message: 'Anda login menggunakan Google',
        buttons: ['OK']
      });
      await alert.present();
      
      // Pindah ke home setelah login
      this.goToHome();
    } catch (error) {
      console.error('Google login error:', error);
      const alert = await this.alertController.create({
        header: 'Login Gagal',
        message: 'Terjadi kesalahan saat login dengan Google',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}