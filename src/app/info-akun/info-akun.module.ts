import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';

import { InfoAkunPageRoutingModule } from './info-akun-routing.module';

import { InfoAkunPage } from './info-akun.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    InfoAkunPageRoutingModule
  ],
  declarations: [InfoAkunPage]
})
export class InfoAkunPageModule {}
