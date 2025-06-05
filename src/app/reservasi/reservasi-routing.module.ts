import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ReservasiPage } from './reservasi.page';

const routes: Routes = [
  {
    path: '',
    component: ReservasiPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReservasiPageRoutingModule {}
