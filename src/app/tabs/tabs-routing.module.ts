import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('../home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'riwayat',
        loadChildren: () => import('../riwayat/riwayat.module').then(m => m.RiwayatPageModule)
      },
      {
        path: 'invoice',
        loadChildren: () => import('../invoice/invoice.module').then(m => m.InvoicePageModule)
      },
      {
        path: 'akun',
        loadChildren: () => import('../akun/akun.module').then(m => m.AkunPageModule)
      },
      {
        path: '',
        redirectTo: '/tabs/home',  // Redirect ke home sebagai default tab
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule {}
