import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RegistrasiPage } from './registrasi.page';

const routes: Routes = [
  {
    path: '',
    component: RegistrasiPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegistrasiPageRoutingModule {}
