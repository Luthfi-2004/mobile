import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { InvoicePageRoutingModule } from './invoice-routing.module';
import { InvoicePage } from './invoice.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InvoicePageRoutingModule
  ],
  declarations: [
    InvoicePage    // InvoicePage bukan standalone → harus dideklarasi
  ]
})
export class InvoicePageModule {}
