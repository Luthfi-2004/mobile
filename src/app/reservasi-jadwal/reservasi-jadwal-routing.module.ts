import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ReservasiJadwalPage } from './reservasi-jadwal.page';

const routes: Routes = [
  {
    path: '',
    component: ReservasiJadwalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReservasiJadwalPageRoutingModule {}
