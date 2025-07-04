import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-bantuan',
  templateUrl: './bantuan.page.html',
  styleUrls: ['./bantuan.page.scss'],
  standalone: false,
})
export class BantuanPage implements OnInit {

  // Form data
  formData = {
    nama: '',
    email: '',
    pesan: ''
  };

  constructor(private alertController: AlertController) { }

  ngOnInit() {
  }

  // Cek apakah semua field sudah diisi
  isFormValid(): boolean {
    return this.formData.nama.trim() !== '' && 
           this.formData.email.trim() !== '' && 
           this.formData.pesan.trim() !== '';
  }

  async kirimPesan() {
    // Cek validasi form
    if (!this.isFormValid()) {
      const alert = await this.alertController.create({
        header: 'Form Tidak Lengkap',
        message: 'Mohon lengkapi semua field sebelum mengirim pesan.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Jika form valid, tampilkan pesan sukses
    const alert = await this.alertController.create({
      header: 'Terima Kasih',
      message: 'Saran Anda telah dikirim. Terima kasih!',
      buttons: ['OK']
    });

    await alert.present();
    
    // Reset form setelah berhasil kirim
    this.resetForm();
  }

  resetForm() {
    this.formData = {
      nama: '',
      email: '',
      pesan: ''
    };
  }

}
