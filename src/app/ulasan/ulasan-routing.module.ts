import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UlasanPage } from './ulasan.page';

const routes: Routes = [
  {
    path: '',
    component: UlasanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UlasanPageRoutingModule {}
