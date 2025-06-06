import { Component, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-info-akun',
  templateUrl: './info-akun.page.html',
  styleUrls: ['./info-akun.page.scss'],
  standalone: false,
})
export class InfoAkunPage {
  @ViewChild('fileInput') fileInput!: ElementRef;
  @Output() profileUpdated = new EventEmitter<{username: string, profileImage: string}>();

  profileImage = 'assets/img/default-profile.jpg'; // Default image
  form: FormGroup;
  currentEditingField: string | null = null;
  originalValues: any = {};

  private currentUserEmail: string | null = null;
  private apiUrl = 'http://localhost:8000/api'; // Ganti dengan alamat API Anda

  constructor(
    private fb: FormBuilder,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private navCtrl: NavController,
    private http: HttpClient
  ) {
    // Inisialisasi form dengan nilai default (akan di-patch nanti)
    this.form = this.fb.group({
      username: ['user123', [Validators.required, Validators.minLength(3)]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.minLength(10)]],
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: [''],
    }, { validators: this.passwordMatchValidator });

    // Panggil fungsi untuk load data user saat komponen dibuat
    this.loadUserData();
  }

  async loadUserData() {
    try {
      // 1. Ambil data user dari localStorage
      const loggedUserDataString = localStorage.getItem('userData');
      if (loggedUserDataString) {
        const loggedUserData = JSON.parse(loggedUserDataString);
        this.currentUserEmail = loggedUserData.email;
        this.updateFormWithUserData(loggedUserData);
        this.saveOriginalValues(); // Simpan nilai awal dari localStorage
        return; // Hentikan eksekusi jika data ditemukan di localStorage
      }

      // 2. Jika tidak ada data di localStorage, coba ambil dari database
      const userId = this.getUserId();
      if (!userId) {
        console.warn('User ID not found in localStorage. Cannot fetch user data from API.');
        return;
      }

      const loading = await this.loadingController.create({
        message: 'Memuat data...',
        spinner: 'crescent'
      });
      await loading.present();

      this.http.get(`${this.apiUrl}/pengguna/${userId}`).subscribe(
        (response: any) => {
          loading.dismiss();
          const dbUserData = {
            username: response.nama,
            email: response.email,
            phone: response.nomor_hp,
            profileImage: response.profileImage || this.profileImage // Gunakan gambar profil dari API jika ada
          };
          this.updateFormWithUserData(dbUserData);
          this.saveOriginalValues();
        },
        async (error) => {
          loading.dismiss();
          console.error('Failed to load user data from server:', error);
          const alert = await this.alertController.create({
            header: 'Error',
            message: 'Gagal memuat data dari server. Silakan coba lagi nanti.',
            buttons: ['OK']
          });
          await alert.present();
        }
      );
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  private updateFormWithUserData(userData: any) {
    this.form.patchValue({
      username: userData.username || userData.nama || 'user123',
      email: userData.email || '',
      phone: userData.phone || userData.nomor_hp || ''
    });

    if (userData.profileImage) {
      this.profileImage = userData.profileImage;
    } else {
      // Jika tidak ada gambar profil di userData, coba ambil dari localStorage jika ada
      const storedProfileImage = localStorage.getItem('profileImage');
      if (storedProfileImage) {
        this.profileImage = storedProfileImage;
      }
    }
  }

  private getUserId(): number | null {
    // Ambil userId dari localStorage, ini harus diset saat login atau registrasi
    const userId = localStorage.getItem('userId');
    return userId ? +userId : null;
  }

  isChanged(): boolean {
    return (
      this.form.get('username')?.value !== this.originalValues.username ||
      this.form.get('phone')?.value !== this.originalValues.phone ||
      this.profileImage !== this.originalValues.profileImage ||
      (this.form.get('newPassword')?.value && this.form.get('newPassword')?.value !== '')
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
        // Simpan gambar profil ke localStorage
        localStorage.setItem('profileImage', this.profileImage);
        this.profileUpdated.emit({
          username: this.form.get('username')?.value,
          profileImage: this.profileImage
        });
      };
      reader.readAsDataURL(file);
    }
  }

  async saveChanges() {
    const usernameChanged = this.form.get('username')?.value !== this.originalValues.username;
    const phoneChanged = this.form.get('phone')?.value !== this.originalValues.phone;
    const imageChanged = this.profileImage !== this.originalValues.profileImage;

    const newPassword = this.form.get('newPassword')?.value;
    const confirmPassword = this.form.get('confirmPassword')?.value;
    const currentPassword = this.form.get('currentPassword')?.value;

    if ((usernameChanged || phoneChanged) && (this.form.get('username')?.invalid || this.form.get('phone')?.invalid)) {
      const alert = await this.alertController.create({
        header: 'Form Tidak Valid',
        message: 'Harap isi Username dan Nomor Telepon dengan benar.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        const alert = await this.alertController.create({
          header: 'Password Saat Ini Diperlukan',
          message: 'Masukkan password saat ini untuk mengubah password',
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }

      if (newPassword.length < 6) {
        const alert = await this.alertController.create({
          header: 'Password Terlalu Pendek',
          message: 'Password baru minimal 6 karakter',
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }

      if (newPassword !== confirmPassword) {
        const alert = await this.alertController.create({
          header: 'Konfirmasi Password Salah',
          message: 'Password baru dan konfirmasi tidak cocok',
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }
    }

    if (!usernameChanged && !phoneChanged && !imageChanged && !newPassword) {
      const alert = await this.alertController.create({
        header: 'Tidak Ada Perubahan',
        message: 'Tidak ada data yang diubah.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Ambil data user dari localStorage
    const loggedUserDataString = localStorage.getItem('userData');
    let loggedUserData = loggedUserDataString ? JSON.parse(loggedUserDataString) : null;

    if (!loggedUserData) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Data pengguna tidak ditemukan. Silakan login kembali.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Simulasi verifikasi password saat ini (jika ada)
    // Di aplikasi nyata, Anda akan mengirim ini ke backend untuk verifikasi
    if (newPassword && loggedUserData.password && loggedUserData.password !== currentPassword) {
        const alert = await this.alertController.create({
            header: 'Password Salah',
            message: 'Password saat ini yang Anda masukkan tidak sesuai',
            buttons: ['OK'],
        });
        await alert.present();
        return;
    }


    const loading = await this.loadingController.create({
      message: 'Menyimpan perubahan...',
      spinner: 'crescent',
    });
    await loading.present();

    // Simulasi penyimpanan ke backend
    setTimeout(async () => {
      await loading.dismiss();

      // Perbarui data di loggedUserData
      if (usernameChanged) loggedUserData.username = this.form.get('username')?.value;
      if (phoneChanged) loggedUserData.phone = this.form.get('phone')?.value;
      if (imageChanged) loggedUserData.profileImage = this.profileImage;
      if (newPassword) loggedUserData.password = newPassword; // Dalam kasus nyata, Anda tidak akan menyimpan password di localStorage

      // Simpan kembali data yang diperbarui ke localStorage
      localStorage.setItem('userData', JSON.stringify(loggedUserData));
      localStorage.setItem('profileImage', this.profileImage); // Pastikan gambar profil juga disimpan terpisah jika perlu

      this.profileUpdated.emit({
        username: loggedUserData.username,
        profileImage: loggedUserData.profileImage,
      });

      this.saveOriginalValues();
      this.currentEditingField = null;

      this.form.patchValue({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

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