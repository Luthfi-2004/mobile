import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, IonInput } from '@ionic/angular';

@Component({
  selector: 'app-info-akun',
  templateUrl: './info-akun.page.html',
  styleUrls: ['./info-akun.page.scss'],
  standalone: false,
})
export class InfoAkunPage {
  @ViewChild('fileInput') fileInput!: ElementRef;

  profileImage = 'assets/img/default-profile.jpg';
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private alertController: AlertController
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9]+$/)]],
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });
  }

  // Validator untuk memastikan password baru dan konfirmasi sama
  passwordMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value 
      ? null : { mismatch: true };
  }

  // Fungsi untuk mengganti foto profil
  changeProfilePicture() {
    this.fileInput.nativeElement.click();
  }

  // Handler untuk perubahan gambar
  handleImageChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Fungsi simpan perubahan
  async saveChanges() {
    if (this.form.invalid) return;

    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: 'Simpan perubahan?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Simpan',
          handler: () => {
            console.log('Data disimpan:', this.form.value);
            // Tambahkan logika penyimpanan ke backend di sini
          }
        }
      ]
    });

    await alert.present();
  }
}