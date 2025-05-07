import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReservasiJadwalPageRoutingModule } from './reservasi-jadwal-routing.module';

import { ReservasiJadwalPage } from './reservasi-jadwal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReservasiJadwalPageRoutingModule
  ],
  declarations: [ReservasiJadwalPage]
})
export class ReservasiJadwalPageModule {}
