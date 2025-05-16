import { Component, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController } from '@ionic/angular';

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
  originalValues: any = {}; // Menyimpan nilai awal sebelum edit

  constructor(
    private fb: FormBuilder,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    // Inisialisasi form dengan nilai dari localStorage jika ada
    this.form = this.fb.group({
      username: [localStorage.getItem('username') || 'user123', [Validators.required, Validators.minLength(3)]],
      email: ['user@example.com', [Validators.required, Validators.email]],
      phone: ['081234567890', [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.minLength(10)]],
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: [''],
    }, { validators: this.passwordMatchValidator });

    // Simpan nilai awal untuk fitur "batal edit"
    this.saveOriginalValues();
  }

  /**
   * Menyimpan nilai awal form
   */
  saveOriginalValues() {
    this.originalValues = {
      username: this.form.get('username')?.value,
      email: this.form.get('email')?.value,
      phone: this.form.get('phone')?.value,
    };
  }

  /**
   * Validasi kesesuaian password baru & konfirmasi password
   */
  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword || confirmPassword) {
      return newPassword === confirmPassword ? null : { mismatch: true };
    }
    return null;
  }

  /**
   * Cek apakah field sedang dalam mode edit
   */
  isEditing(field: string): boolean {
    return this.currentEditingField === field;
  }

  /**
   * Toggle mode edit (aktif/non-aktif)
   */
  toggleEdit(field: string) {
    if (this.isEditing(field)) {
      // Jika sedang edit, batalkan dan kembalikan nilai awal
      this.form.get(field)?.setValue(this.originalValues[field]);
      this.currentEditingField = null;
    } else {
      // Jika belum edit, aktifkan mode edit
      this.currentEditingField = field;
    }
  }

  /**
   * Ganti foto profil
   */
  changeProfilePicture() {
    this.fileInput.nativeElement.click();
  }

  /**
   * Handle perubahan gambar
   */
  handleImageChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImage = e.target.result;
        // Simpan ke localStorage
        localStorage.setItem('profileImage', this.profileImage);
        // Emit event untuk update komponen lain
        this.profileUpdated.emit({
          username: this.form.get('username')?.value,
          profileImage: this.profileImage
        });
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Simpan perubahan data
   */
  async saveChanges() {
    // Validasi form
    if (this.form.invalid) {
      const alert = await this.alertController.create({
        header: 'Form Tidak Valid',
        message: 'Harap periksa kembali data yang Anda masukkan',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Validasi perubahan password
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

    // Tampilkan loading
    const loading = await this.loadingController.create({
      message: 'Menyimpan perubahan...',
      spinner: 'crescent',
    });
    await loading.present();

    // Simulasi proses penyimpanan (ganti dengan API call di production)
    setTimeout(async () => {
      await loading.dismiss();

      // Simpan username ke localStorage
      const newUsername = this.form.get('username')?.value;
      localStorage.setItem('username', newUsername);

      // Emit event untuk update komponen lain
      this.profileUpdated.emit({
        username: newUsername,
        profileImage: this.profileImage
      });

      // Simpan nilai baru sebagai "originalValues"
      this.saveOriginalValues();
      
      // Reset mode edit
      this.currentEditingField = null;

      // Reset form password jika berhasil
      if (newPassword) {
        this.form.patchValue({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }

      // Tampilkan notifikasi sukses
      const alert = await this.alertController.create({
        header: 'Berhasil',
        message: 'Perubahan berhasil disimpan',
        buttons: ['OK'],
      });
      await alert.present();
    }, 1500);
  }
}