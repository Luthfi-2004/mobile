import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TentangKamiPageRoutingModule } from './tentang-kami-routing.module';

import { TentangKamiPage } from './tentang-kami.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TentangKamiPageRoutingModule
  ],
  declarations: [TentangKamiPage]
})
export class TentangKamiPageModule {}
