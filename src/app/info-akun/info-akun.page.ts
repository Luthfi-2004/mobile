import { Component, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController } from '@ionic/angular';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-info-akun',
  templateUrl: './info-akun.page.html',
  styleUrls: ['./info-akun.page.scss'],
  standalone: false,
})
export class InfoAkunPage {
  @ViewChild('fileInput') fileInput!: ElementRef;
  @Output() profileUpdated = new EventEmitter<{username: string, profileImage: string}>();

  profileImage = localStorage.getItem('profileImage') || 'assets/img/default-profile.jpg';
  form: FormGroup;
  currentEditingField: string | null = null;
  originalValues: any = {};

  private currentUserEmail: string | null = null;

  constructor(
    private fb: FormBuilder,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private navCtrl: NavController
  ) {
    const loggedUser = localStorage.getItem('userData');
    const currentUser = loggedUser ? JSON.parse(loggedUser) : null;
    this.currentUserEmail = currentUser?.email || null;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userData = users.find((u: any) => u.email === this.currentUserEmail);

    this.form = this.fb.group({
      username: [userData?.username || 'user123', [Validators.required, Validators.minLength(3)]],
      email: [{ value: userData?.email || '', disabled: true }, [Validators.required, Validators.email]],
      phone: [userData?.phone || '', [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.minLength(10)]],
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: [''],
    }, { validators: this.passwordMatchValidator });

    this.profileImage = userData?.profileImage || this.profileImage;

    this.saveOriginalValues();
  }

  isChanged(): boolean {
    return (
      this.form.get('username')?.value !== this.originalValues.username ||
      this.form.get('phone')?.value !== this.originalValues.phone ||
      this.profileImage !== this.originalValues.profileImage
    );
  }

  saveOriginalValues() {
    this.originalValues = {
      username: this.form.get('username')?.value,
      phone: this.form.get('phone')?.value,
      profileImage: this.profileImage
    };
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword || confirmPassword) {
      return newPassword === confirmPassword ? null : { mismatch: true };
    }
    return null;
  }

  isEditing(field: string): boolean {
    return this.currentEditingField === field;
  }

  toggleEdit(field: string) {
    if (this.isEditing(field)) {
      this.form.get(field)?.setValue(this.originalValues[field]);
      this.currentEditingField = null;
    } else {
      this.currentEditingField = field;
      this.form.get(field)?.markAsTouched();
    }
  }

  changeProfilePicture() {
    this.fileInput.nativeElement.click();
  }

  handleImageChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImage = e.target.result;
        this.profileUpdated.emit({
          username: this.form.get('username')?.value,
          profileImage: this.profileImage
        });
      };
      reader.readAsDataURL(file);
    }
  }

  async saveChanges() {
    if (this.form.invalid) {
      const alert = await this.alertController.create({
        header: 'Form Tidak Valid',
        message: 'Harap periksa kembali data yang Anda masukkan',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const newPassword = this.form.get('newPassword')?.value;
    const currentPassword = this.form.get('currentPassword')?.value;

    if (newPassword && !currentPassword) {
      const alert = await this.alertController.create({
        header: 'Password Saat Ini Diperlukan',
        message: 'Anda harus memasukkan password saat ini untuk mengubah password',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: any) => u.email === this.currentUserEmail);

    if (userIndex === -1) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'User tidak ditemukan',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    if (newPassword) {
      if (users[userIndex].password !== currentPassword) {
        const alert = await this.alertController.create({
          header: 'Password Salah',
          message: 'Password saat ini yang Anda masukkan tidak sesuai',
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }
    }

    const loading = await this.loadingController.create({
      message: 'Menyimpan perubahan...',
      spinner: 'crescent',
    });
    await loading.present();

    setTimeout(async () => {
      await loading.dismiss();

      users[userIndex].username = this.form.get('username')?.value;
      users[userIndex].phone = this.form.get('phone')?.value;
      users[userIndex].profileImage = this.profileImage;

      if (newPassword) {
        users[userIndex].password = newPassword;
      }

      localStorage.setItem('users', JSON.stringify(users));

      localStorage.setItem('userData', JSON.stringify({
        email: users[userIndex].email,
        username: users[userIndex].username,
        phone: users[userIndex].phone,
        loggedIn: true,
        profileImage: this.profileImage,
      }));

      this.profileUpdated.emit({
        username: users[userIndex].username,
        profileImage: this.profileImage
      });

      this.saveOriginalValues();
      this.currentEditingField = null;

      if (newPassword) {
        this.form.patchValue({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }

      const alert = await this.alertController.create({
        header: 'Berhasil',
        message: 'Perubahan berhasil disimpan',
        buttons: ['OK'],
      });
      await alert.present();
      await alert.onDidDismiss();
      this.navCtrl.navigateRoot('/tabs/akun');
    }, 1500);
  }
}