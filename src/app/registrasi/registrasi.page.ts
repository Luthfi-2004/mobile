import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService, RegisterData } from '../auth.service';

@Component({
  selector: 'app-registrasi',
  templateUrl: './registrasi.page.html',
  styleUrls: ['./registrasi.page.scss'],
  standalone: false
})
export class RegistrasiPage implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.registerForm = this.formBuilder.group({
      nama: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      nomor_hp: ['', [Validators.pattern(/^[0-9\+\-\s]+$/), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(255)]],
      password_confirmation: ['', [Validators.required, Validators.maxLength(255)]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {
    // Jika pengguna sudah login, langsung redirect ke halaman home
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/tabs/home']);
    }
  }

  // Validator custom untuk mencocokkan password dan konfirmasi password
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('password_confirmation');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      if (confirmPassword?.errors?.['mismatch']) {
        delete confirmPassword.errors['mismatch'];
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
      return null;
    }
  }

  // Fungsi untuk menampilkan/menghilangkan teks password
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Formatter untuk counter di ion-input
  customCounterFormatter(inputLength: number, maxLength: number): string {
    return `${inputLength} / ${maxLength}`;
  }

  // Logic saat tombol submit ditekan
  async onRegister() {
    if (this.registerForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const loading = await this.loadingController.create({
        message: 'Mendaftarkan akun...',
        spinner: 'circles'
      });
      await loading.present();

      const registerData: RegisterData = {
        nama: this.registerForm.value.nama.trim(),
        email: this.registerForm.value.email.trim().toLowerCase(),
        nomor_hp: this.registerForm.value.nomor_hp?.trim() || undefined,
        password: this.registerForm.value.password,
        password_confirmation: this.registerForm.value.password_confirmation
      };

      this.authService.register(registerData).subscribe({
        next: async (response) => {
          await loading.dismiss();
          this.isSubmitting = false;
          
          // Tampilkan toast sukses
          await this.showToast(`Selamat datang, ${response.user.nama}! Akun berhasil dibuat.`);
          // Redirect ke dashboard
          this.router.navigate(['/tabs/home']);
        },
        error: async (error) => {
          await loading.dismiss();
          this.isSubmitting = false;
          
          let errorMessage = 'Terjadi kesalahan saat mendaftar.';
          
          console.error('Registration error:', error);
          
          if (error.status === 422 && error.error?.errors) {
            // Handle Laravel validation errors
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

          await this.showAlert('Registrasi Gagal', errorMessage);
        }
      });
    } else {
      // Tandai semua kontrol agar menampilkan pesan error bila ada yang invalid
      this.markFormGroupTouched(this.registerForm);
      await this.showAlert('Form Tidak Valid', 'Mohon periksa kembali data yang Anda masukkan.');
    }
  }

  // Tandai setiap kontrol di form sebagai touched untuk men-trigger validasi
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // Navigasi ke halaman login
  goToLogin() {
    this.router.navigate(['/login']);
  }

  // Utility untuk menampilkan alert
  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Utility untuk menampilkan toast
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}