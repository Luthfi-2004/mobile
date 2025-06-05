import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RiwayatPageRoutingModule } from './riwayat-routing.module';

import { RiwayatPage } from './riwayat.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RiwayatPageRoutingModule
  ],
  declarations: [RiwayatPage]
})
export class RiwayatPageModule {}
