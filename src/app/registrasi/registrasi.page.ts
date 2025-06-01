import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-registrasi',
  templateUrl: './registrasi.page.html',
  styleUrls: ['./registrasi.page.scss'],
  standalone: false
})
export class RegistrasiPage {
  username = '';
  telp = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(private router: Router, private alertController: AlertController) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async showAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Pemberitahuan',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async registerUser() {
    if (!this.username || !this.telp || !this.email || !this.password || !this.confirmPassword) {
      await this.showAlert('Mohon isi semua data!');
      return;
    }

    if (this.password !== this.confirmPassword) {
      await this.showAlert('Password dan Confirm Password tidak sama!');
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');

    const exists = users.some(
      (u: any) => u.username === this.username || u.email === this.email
    );
    if (exists) {
      await this.showAlert('Username atau Email sudah terdaftar!');
      return;
    }

    users.push({
      username: this.username,
      telp: this.telp,
      email: this.email,
      password: this.password,
    });

    localStorage.setItem('users', JSON.stringify(users));
    await this.showAlert('Registrasi berhasil! Silakan login.');
    this.router.navigate(['/login']);
  }

  customCounterFormatter = (inputLength: number, maxLength: number): string => {
    return `${inputLength}/${maxLength}`;
  };
}
