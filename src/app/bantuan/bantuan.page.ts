import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-bantuan',
  templateUrl: './bantuan.page.html',
  styleUrls: ['./bantuan.page.scss'],
  standalone: false,
})
export class BantuanPage implements OnInit {

  constructor(private alertController: AlertController) { }

  ngOnInit() {
  }

  async kirimPesan() {
    const alert = await this.alertController.create({
      header: 'Terima Kasih',
      message: 'Saran Anda telah dikirim. Terima kasih!',
      buttons: ['OK']
    });

    await alert.present();
  }

}