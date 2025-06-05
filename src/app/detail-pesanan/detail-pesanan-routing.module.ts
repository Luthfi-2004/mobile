import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetailPesananPage } from './detail-pesanan.page';

const routes: Routes = [
  {
    path: '',
    component: DetailPesananPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DetailPesananPageRoutingModule {}
