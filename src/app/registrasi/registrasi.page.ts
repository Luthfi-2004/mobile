import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService, RegisterData } from '../auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-registrasi',
  templateUrl: './registrasi.page.html',
  styleUrls: ['./registrasi.page.scss'],
  standalone: false
})
export class RegistrasiPage implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  private authSubscription?: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/tabs/home']);
    }
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Fungsi untuk navigasi kembali
  goBack() {
    this.router.navigate(['/splash']); // Ganti dengan halaman sebelumnya
  }

  private initializeForm() {
    this.registerForm = this.formBuilder.group({
      nama: [
        '', 
        [
          Validators.required, 
          Validators.minLength(2), 
          Validators.maxLength(255),
          this.noSpecialCharsValidator
        ]
      ],
      nomor_hp: [
        '', 
        [
          Validators.pattern(/^(\+62|62|0)[0-9]{8,13}$/),
          Validators.maxLength(20)
        ]
      ],
      email: [
        '', 
        [
          Validators.required, 
          Validators.email, 
          Validators.maxLength(255)
        ]
      ],
      password: [
        '', 
        [
          Validators.required, 
          Validators.minLength(8), 
          Validators.maxLength(255),
          this.strongPasswordValidator
        ]
      ],
      password_confirmation: [
        '', 
        [
          Validators.required, 
          Validators.maxLength(255)
        ]
      ]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private noSpecialCharsValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;
    
    const pattern = /^[a-zA-Z\s]+$/;
    if (!pattern.test(control.value)) {
      return { 'specialChars': true };
    }
    return null;
  }

  private strongPasswordValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;
    
    const value = control.value;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    
    if (value.length >= 8 && hasUpperCase && hasLowerCase && hasNumber) {
      return null;
    }
    
    return { 'weakPassword': true };
  }

  private passwordMatchValidator(form: FormGroup): { [key: string]: any } | null {
    const password = form.get('password');
    const confirmPassword = form.get('password_confirmation');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ ...confirmPassword.errors, mismatch: true });
      return { mismatch: true };
    } else {
      if (confirmPassword?.errors?.['mismatch']) {
        const { mismatch, ...otherErrors } = confirmPassword.errors;
        const hasOtherErrors = Object.keys(otherErrors).length > 0;
        confirmPassword.setErrors(hasOtherErrors ? otherErrors : null);
      }
      return null;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  customCounterFormatter(inputLength: number, maxLength: number): string {
    return `${inputLength} / ${maxLength}`;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${this.getFieldLabel(fieldName)} wajib diisi.`;
    if (errors['email']) return 'Format email tidak valid.';
    if (errors['minlength']) return `${this.getFieldLabel(fieldName)} minimal ${errors['minlength'].requiredLength} karakter.`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} maksimal ${errors['maxlength'].requiredLength} karakter.`;
    if (errors['pattern']) {
      if (fieldName === 'nomor_hp') return 'Format nomor HP tidak valid. Contoh: 08123456789 atau +6281234567890';
      return 'Format tidak valid.';
    }
    if (errors['specialChars']) return 'Nama tidak boleh mengandung karakter khusus atau angka.';
    if (errors['weakPassword']) return 'Password harus mengandung huruf besar, huruf kecil, dan angka.';
    if (errors['mismatch']) return 'Konfirmasi password tidak cocok.';
    
    return 'Input tidak valid.';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'nama': 'Nama',
      'nomor_hp': 'Nomor HP',
      'email': 'Email',
      'password': 'Password',
      'password_confirmation': 'Konfirmasi Password'
    };
    return labels[fieldName] || fieldName;
  }

  hasError(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.errors && field.touched);
  }

  async onRegister() {
    if (this.registerForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const loading = await this.loadingController.create({
        message: 'Mendaftarkan akun...',
        spinner: 'circles',
        backdropDismiss: false
      });
      await loading.present();

      const registerData: RegisterData = {
        nama: this.registerForm.value.nama.trim(),
        email: this.registerForm.value.email.trim().toLowerCase(),
        nomor_hp: this.registerForm.value.nomor_hp?.trim() || undefined,
        password: this.registerForm.value.password,
        password_confirmation: this.registerForm.value.password_confirmation
      };

      if (!registerData.nomor_hp) {
        delete registerData.nomor_hp;
      }

      this.authSubscription = this.authService.register(registerData).subscribe({
        next: async (response) => {
          await loading.dismiss();
          this.isSubmitting = false;
          
          await this.showToast(
            `Selamat datang, ${response.user.nama}! Akun berhasil dibuat.`,
            'success'
          );
          
          this.registerForm.reset();
          
          setTimeout(() => {
            this.router.navigate(['/tabs/home']);
          }, 1000);
        },
        error: async (error) => {
          await loading.dismiss();
          this.isSubmitting = false;
          
          console.error('Registration error:', error);
          const errorMessage = error.userMessage || 'Terjadi kesalahan saat mendaftar.';
          await this.showAlert('Registrasi Gagal', errorMessage);
        }
      });
    } else {
      this.markFormGroupTouched(this.registerForm);
      
      const firstErrorField = this.getFirstErrorField();
      if (firstErrorField) {
        const errorMessage = this.getErrorMessage(firstErrorField);
        await this.showAlert('Form Tidak Valid', errorMessage);
      } else {
        await this.showAlert('Form Tidak Valid', 'Mohon periksa kembali data yang Anda masukkan.');
      }
    }
  }

  private getFirstErrorField(): string | null {
    const fieldOrder = ['nama', 'email', 'nomor_hp', 'password', 'password_confirmation'];
    
    for (const fieldName of fieldOrder) {
      const field = this.registerForm.get(fieldName);
      if (field && field.errors) {
        return fieldName;
      }
    }
    return null;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      backdropDismiss: false
    });
    await alert.present();
  }

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  onNomorHpInput(event: any) {
    let value = event.target.value;
    value = value.replace(/[^\d+]/g, '');
    
    if (value.startsWith('0')) {
    } else if (value.startsWith('8') && !value.startsWith('+')) {
      value = '+62' + value;
    } else if (value.startsWith('62') && !value.startsWith('+')) {
      value = '+' + value;
    }
    
    this.registerForm.patchValue({ nomor_hp: value });
  }
}