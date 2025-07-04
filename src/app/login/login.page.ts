import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService, LoginData } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/tabs/home']);
    }
  }

  public navigateToSplash(): void {
    this.router.navigate(['/splash']);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  async onLogin() {
    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const loading = await this.loadingController.create({
        message: 'Memproses login...',
        spinner: 'circles'
      });
      await loading.present();

      const loginData: LoginData = {
        email: this.loginForm.value.email.trim(),
        password: this.loginForm.value.password
      };

      this.authService.login(loginData).subscribe({
        next: async (response) => {
          await loading.dismiss();
          this.isSubmitting = false;
          
          localStorage.setItem('userData', JSON.stringify({
            email: response.user.email,
            username: response.user.nama,
            phone: response.user.nomor_hp,
            loggedIn: true,
            profileImage: localStorage.getItem('profileImage') || 'assets/img/default-profile.jpg'
          }));
          localStorage.setItem('userId', String(response.user.id));

          await this.showToast(`Selamat datang, ${response.user.nama}!`);
          this.router.navigate(['/tabs/home']);
        },
        error: async (error) => {
          await loading.dismiss();
          this.isSubmitting = false;
          
          let errorMessage = 'Terjadi kesalahan saat login.';
          console.error('Login error:', error);

          if (error.status === 401) {
            errorMessage = 'Email/nomor HP atau password tidak valid.';
          } else if (error.status === 403) {
            errorMessage = 'Akses ditolak. Anda tidak memiliki izin sebagai pelanggan.';
          } else if (error.status === 422 && error.error?.errors) {
            const errors = error.error.errors;
            const errorMessages: string[] = [];

            Object.keys(errors).forEach(field => {
              if (Array.isArray(errors[field])) {
                errorMessages.push(...errors[field]);
              } else {
                errorMessages.push(errors[field]);
              }
            });

            errorMessage = errorMessages.join('\n');
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 0) {
            errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
          } else if (error.status === 500) {
            errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
          }

          await this.showAlert('Login Gagal', errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched(this.loginForm);

      let errorMessage = 'Mohon periksa kembali data yang Anda masukkan.';
      if (this.loginForm.get('email')?.invalid && this.loginForm.get('password')?.invalid) {
        errorMessage = 'Email/nomor HP dan Password wajib diisi.';
      } else if (this.loginForm.get('email')?.invalid) {
        errorMessage = 'Email atau nomor HP wajib diisi.';
      } else if (this.loginForm.get('password')?.invalid) {
        errorMessage = 'Password wajib diisi dan minimal 8 karakter.';
      }

      await this.showAlert('Login Gagal', errorMessage);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}