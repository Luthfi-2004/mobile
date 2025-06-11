// invoice-detail.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { InvoiceDetailPageRoutingModule } from './invoice-detail-routing.module';
import { InvoiceDetailPage } from './invoice-detail.page';
// Import standalone component
import { QRCodeComponent } from 'angularx-qrcode';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InvoiceDetailPageRoutingModule,
    QRCodeComponent  // ✅ benar
  ],
  declarations: [InvoiceDetailPage]
})
export class InvoiceDetailPageModule {}
