import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { RegistrasiPageRoutingModule } from './registrasi-routing.module';
import { RegistrasiPage } from './registrasi.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // 👈 TAMBAHKAN INI - Diperlukan untuk FormBuilder
    IonicModule,
    RegistrasiPageRoutingModule
  ],
  declarations: [RegistrasiPage]
})
export class RegistrasiPageModule {}