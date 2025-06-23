// src/app/info-akun/info-akun.page.ts

import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { ActionSheetController, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService, User } from '../auth.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Observable } from 'rxjs';
import { ProfileImageService } from '../services/profile-image.service'; // <-- IMPORT SERVICE YANG BENAR

@Component({
  selector: 'app-info-akun',
  templateUrl: './info-akun.page.html',
  styleUrls: ['./info-akun.page.scss'],
  standalone: false
})
export class InfoAkunPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  form!: FormGroup;
  currentUser: User | null = null;
  profileImage: SafeUrl = 'assets/img/default-profile.jpg';
  initialFormValue: any;
  isSubmitting = false;

  private editingField: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileImageService: ProfileImageService, // <-- INJEKSI SERVICE
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(8)]],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.loadUserData();
    this.profileImageService.currentProfileImage$.subscribe(image => {
      this.profileImage = image;
    });
  }

  passwordMatchValidator: ValidatorFn = (control: AbstractControl): { [key: string]: boolean } | null => {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (newPassword?.value || confirmPassword?.value) {
      if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
        return { 'mismatch': true };
      }
    }
    return null;
  };

  loadUserData() {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.form.patchValue({
        username: this.currentUser.nama,
        email: this.currentUser.email,
        phone: this.currentUser.nomor_hp || ''
      });
      this.initialFormValue = this.form.value;

      // Gunakan ProfileImageService untuk memuat gambar
      this.profileImageService.loadCurrentUserProfileImage(this.currentUser.id);
    }
  }

  isChanged(): boolean {
    const currentValues = {
      username: this.form.get('username')?.value,
      email: this.form.get('email')?.value,
      phone: this.form.get('phone')?.value
    };
    const initialValues = {
      username: this.initialFormValue.username,
      email: this.initialFormValue.email,
      phone: this.initialFormValue.phone
    };
    const accountInfoChanged = JSON.stringify(currentValues) !== JSON.stringify(initialValues);

    const passwordFieldsFilled =
      this.form.get('currentPassword')?.value ||
      this.form.get('newPassword')?.value ||
      this.form.get('confirmPassword')?.value;

    return accountInfoChanged || (passwordFieldsFilled && this.form.valid);
  }

  isEditing(field: string): boolean {
    return this.editingField === field;
  }

  toggleEdit(field: string) {
    this.editingField = this.editingField === field ? null : field;
  }

  async saveChanges() {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      await this.showAlert('Validasi Gagal', 'Mohon lengkapi data dengan benar.');
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Menyimpan perubahan...',
      spinner: 'circles'
    });
    await loading.present();

    const currentPassword = this.form.get('currentPassword')?.value;
    const newPassword = this.form.get('newPassword')?.value;
    const confirmPassword = this.form.get('confirmPassword')?.value;

    let profileUpdateObservable: Observable<any> | undefined;
    let passwordChangeObservable: Observable<any> | undefined;

    const accountInfoChanges = {
      nama: this.form.get('username')?.value,
      email: this.form.get('email')?.value,
      nomor_hp: this.form.get('phone')?.value,
    };
    const initialAccountInfo = {
      nama: this.initialFormValue.username,
      email: this.initialFormValue.email,
      nomor_hp: this.initialFormValue.phone,
    };

    if (JSON.stringify(accountInfoChanges) !== JSON.stringify(initialAccountInfo)) {
      profileUpdateObservable = this.authService.authenticatedRequest('put', '/customer/profile', accountInfoChanges);
    }

    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        await loading.dismiss();
        this.isSubmitting = false;
        await this.showAlert('Gagal Ganti Kata Sandi', 'Untuk mengganti password, Anda harus mengisi Kata Sandi Saat Ini, Kata Sandi Baru, dan Konfirmasi Kata Sandi.');
        return;
      }
      if (newPassword !== confirmPassword) {
        await loading.dismiss();
        this.isSubmitting = false;
        await this.showAlert('Gagal Ganti Kata Sandi', 'Kata Sandi Baru dan Konfirmasi Kata Sandi tidak cocok.');
        return;
      }

      passwordChangeObservable = this.authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword
      });
    }

    if (profileUpdateObservable && passwordChangeObservable) {
      profileUpdateObservable.subscribe({
        next: async () => {
          this.updateLocalStorageUserData(accountInfoChanges);
          passwordChangeObservable?.subscribe({
            next: async (res: any) => {
              await loading.dismiss();
              this.isSubmitting = false;
              await this.showToast(res.message || 'Profil dan Kata Sandi berhasil diperbarui.');
              this.resetPasswordFormFields();
              this.loadUserData();
            },
            error: async (err: any) => {
              await loading.dismiss();
              this.isSubmitting = false;
              await this.showAlert('Gagal Ganti Kata Sandi', err.userMessage || 'Terjadi kesalahan saat mengganti kata sandi.');
            }
          });
        },
        error: async (err: any) => {
          await loading.dismiss();
          this.isSubmitting = false;
          await this.showAlert('Gagal Update Profil', err.userMessage || 'Terjadi kesalahan saat memperbarui informasi profil.');
        }
      });
    } else if (profileUpdateObservable) {
      profileUpdateObservable.subscribe({
        next: async (res: any) => {
          await loading.dismiss();
          this.isSubmitting = false;
          await this.showToast(res.message || 'Informasi profil berhasil diperbarui.');
          this.updateLocalStorageUserData(accountInfoChanges);
          this.loadUserData();
        },
        error: async (err: any) => {
          await loading.dismiss();
          this.isSubmitting = false;
          await this.showAlert('Gagal Update Profil', err.userMessage || 'Terjadi kesalahan saat memperbarui informasi profil.');
        }
      });
    } else if (passwordChangeObservable) {
      passwordChangeObservable.subscribe({
        next: async (res: any) => {
          await loading.dismiss();
          this.isSubmitting = false;
          await this.showToast(res.message || 'Kata Sandi berhasil diperbarui.');
          this.resetPasswordFormFields();
          this.loadUserData();
        },
        error: async (err: any) => {
          await loading.dismiss();
          this.isSubmitting = false;
          await this.showAlert('Gagal Ganti Kata Sandi', err.userMessage || 'Terjadi kesalahan saat mengganti kata sandi.');
        }
      });
    } else {
      await loading.dismiss();
      this.isSubmitting = false;
      await this.showToast('Tidak ada perubahan untuk disimpan.', 'warning');
    }
  }

  private updateLocalStorageUserData(changes: any) {
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const updatedUser = { ...userData, nama: changes.nama, email: changes.email, nomor_hp: changes.nomor_hp };
    localStorage.setItem('user_data', JSON.stringify(updatedUser));
    this.authService.updateCurrentUser(updatedUser);
  }

  private resetPasswordFormFields() {
    this.form.patchValue({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    this.form.updateValueAndValidity();
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
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  async changeProfilePicture() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Pilih Sumber Gambar',
      buttons: [
        {
          text: 'Ambil Foto',
          icon: 'camera',
          handler: () => this.takePicture(CameraSource.Camera)
        },
        {
          text: 'Pilih dari Galeri',
          icon: 'image',
          handler: () => this.takePicture(CameraSource.Photos)
        },
        {
          text: 'Batal',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image && image.dataUrl && this.currentUser) {
        const compressed = await this.profileImageService.compressImage(image.dataUrl);
        this.profileImageService.setUserProfileImage(this.currentUser.id, compressed);
        this.showToast('Foto profil berhasil diubah!', 'success');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      this.showToast('Gagal mengambil foto.', 'danger');
    }
  }

  handleImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.currentUser) {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl = reader.result as string;
        const compressed = await this.profileImageService.compressImage(imageDataUrl);
        this.profileImageService.setUserProfileImage(this.currentUser!.id, compressed);
        this.showToast('Foto profil berhasil diubah!', 'success');
      };
      reader.readAsDataURL(file);
    }
  }
}