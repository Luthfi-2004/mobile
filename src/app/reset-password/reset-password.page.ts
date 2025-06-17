import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage implements OnInit {
  resetPasswordForm: FormGroup;
  isSubmitting = false;
  identifier: string | null = null; // Ini akan menerima token atau identifier dari URL
  showPassword1 = false;
  showPassword2 = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute, // Untuk mengambil parameter dari URL
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.resetPasswordForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {
    this.identifier = this.route.snapshot.paramMap.get('identifier');
    if (!this.identifier) {
      this.showAlert('Error', 'Identifier reset password tidak ditemukan. Silakan mulai ulang proses.');
      this.router.navigate(['/forgot-password']);
    }
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const passwordConfirmation = formGroup.get('password_confirmation')?.value;
    return password === passwordConfirmation ? null : { mismatch: true };
  }

  togglePassword1() {
    this.showPassword1 = !this.showPassword1;
  }

  togglePassword2() {
    this.showPassword2 = !this.showPassword2;
  }

  async onSubmit() {
    if (this.resetPasswordForm.valid && !this.isSubmitting && this.identifier) {
      this.isSubmitting = true;
      const loading = await this.loadingController.create({
        message: 'Mengubah password...',
        spinner: 'circles'
      });
      await loading.present();

      const { password, password_confirmation } = this.resetPasswordForm.value;

      this.authService.resetPassword(this.identifier, password, password_confirmation).subscribe({
        next: async (response) => {
          await loading.dismiss();
          this.isSubmitting = false;
          await this.showToast(response.message || 'Password berhasil diubah. Silakan login.');
          this.router.navigate(['/login']);
        },
        error: async (error) => {
          await loading.dismiss();
          this.isSubmitting = false;
          let errorMessage = 'Gagal mengubah password.';
          if (error.status === 422 && error.error?.errors) {
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
          }
          await this.showAlert('Gagal', errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched(this.resetPasswordForm);
      await this.showAlert('Input Tidak Valid', 'Mohon periksa kembali password Anda.');
    }
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

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}