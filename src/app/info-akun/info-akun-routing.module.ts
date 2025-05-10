import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InfoAkunPage } from './info-akun.page';

const routes: Routes = [
  {
    path: '',
    component: InfoAkunPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InfoAkunPageRoutingModule {}
