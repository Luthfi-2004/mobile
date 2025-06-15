import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-map-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Denah Restoran</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="map-container">
        <img src="assets/img/denah-restoran.png" alt="Denah Restoran" class="map-image" />
      </div>
    </ion-content>
  `,
  styles: [`
    .map-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }
    
    .map-image {
      width: 100%;
      height: auto;
      max-width: 100%;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
  `],
  standalone: false
})
export class MapModalComponent {
  
  constructor(private modalCtrl: ModalController) {}
  
  dismiss() {
    this.modalCtrl.dismiss();
  }
}   