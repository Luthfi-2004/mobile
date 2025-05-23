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
    this.router.navigate(['/tabs/home']);
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
    // Pindah ke home setelah login
    this.goToHome();
  }

  // Fungsi baru untuk login Google
  async loginWithGoogle() {
    try {
      // Simulasi login Google berhasil
      console.log('Login with Google clicked');
      
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
    }
  }
}