import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UlasanPageRoutingModule } from './ulasan-routing.module';

import { UlasanPage } from './ulasan.page';

import { Router } from '@angular/router';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    UlasanPageRoutingModule
  ],
  declarations: [UlasanPage]
})
export class UlasanPageModule {}
