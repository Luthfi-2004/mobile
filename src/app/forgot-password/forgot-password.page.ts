import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage implements OnInit {
  forgotPasswordForm: FormGroup;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required]] // Bisa email atau nomor HP
    });
  }

  ngOnInit() {}

  // Tambahkan fungsi ini untuk navigasi kembali
  goBack() {
    this.router.navigate(['/login']);
  }

  async onSubmit() {
    if (this.forgotPasswordForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const loading = await this.loadingController.create({
        message: 'Memeriksa data...',
        spinner: 'circles'
      });
      await loading.present();

      const emailOrPhone = this.forgotPasswordForm.value.email.trim();

      this.authService.requestPasswordReset(emailOrPhone).subscribe({
        next: async (response) => {
          await loading.dismiss();
          this.isSubmitting = false;
          await this.showToast(response.message || 'Verifikasi berhasil. Silakan masukkan password baru Anda.');
          this.router.navigate(['/reset-password', response.identifier]); 
        },
        error: async (error) => {
          await loading.dismiss();
          this.isSubmitting = false;
          let errorMessage = 'Gagal memproses permintaan reset password.';
          if (error.status === 404) {
            errorMessage = 'Email atau Nomor HP tidak terdaftar.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          await this.showAlert('Gagal', errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched(this.forgotPasswordForm);
      await this.showAlert('Input Tidak Valid', 'Mohon masukkan email atau nomor telepon Anda.');
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}