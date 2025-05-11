import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DetailPesananPageRoutingModule } from './detail-pesanan-routing.module';

import { DetailPesananPage } from './detail-pesanan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetailPesananPageRoutingModule
  ],
  declarations: [DetailPesananPage]
})
export class DetailPesananPageModule {}
