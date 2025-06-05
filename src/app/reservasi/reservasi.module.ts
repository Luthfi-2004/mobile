import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReservasiPageRoutingModule } from './reservasi-routing.module';

import { ReservasiPage } from './reservasi.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReservasiPageRoutingModule
  ],
  declarations: [ReservasiPage]
})
export class ReservasiPageModule {}
