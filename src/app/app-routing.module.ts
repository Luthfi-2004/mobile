import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',  
    pathMatch: 'full'
  },
  {
    path: 'splash',
    loadChildren: () => import('./splash/splash.module').then(m => m.SplashPageModule)  
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)  
  },
  {
    path: 'registrasi',
    loadChildren: () => import('./registrasi/registrasi.module').then(m => m.RegistrasiPageModule)
  },
  {
    path: 'reservasi',
    loadChildren: () => import('./reservasi/reservasi.module').then(m => m.ReservasiPageModule)
  },
  {
    path: 'reservasi-jadwal',
    loadChildren: () => import('./reservasi-jadwal/reservasi-jadwal.module').then(m => m.ReservasiJadwalPageModule)
  },
  {
    path: 'menu',
    loadChildren: () => import('./menu/menu.module').then(m => m.MenuPageModule)
  },
  {
    path: 'cart',
    loadChildren: () => import('./cart/cart.module').then(m => m.CartPageModule)
  },
  {
    path: 'invoice',
    loadChildren: () => import('./invoice/invoice.module').then(m => m.InvoicePageModule)
  },
  {
    path: 'riwayat',
    loadChildren: () => import('./riwayat/riwayat.module').then(m => m.RiwayatPageModule)
  },
  {
    path: 'detail-pesanan',
    loadChildren: () => import('./detail-pesanan/detail-pesanan.module').then(m => m.DetailPesananPageModule)
  },
  {
    path: 'ulasan',
    loadChildren: () => import('./ulasan/ulasan.module').then(m => m.UlasanPageModule)
  },  
  {
    path: 'notifikasi',
    loadChildren: () => import('./notifikasi/notifikasi.module').then(m => m.NotifikasiPageModule)
  },
  {
    path: 'akun',
    loadChildren: () => import('./akun/akun.module').then(m => m.AkunPageModule)
  },
  {
    path: 'info-akun',
    loadChildren: () => import('./info-akun/info-akun.module').then(m => m.InfoAkunPageModule)
  },
  {
    path: 'tentang-kami',
    loadChildren: () => import('./tentang-kami/tentang-kami.module').then(m => m.TentangKamiPageModule)
  },
  {
    path: 'detail-pesanan',
    loadChildren: () => import('./detail-pesanan/detail-pesanan.module').then(m => m.DetailPesananPageModule)
  },  {
    path: 'bantuan',
    loadChildren: () => import('./bantuan/bantuan.module').then( m => m.BantuanPageModule)
  },
  {
    path: 'invoice-detail',
    loadChildren: () => import('./invoice-detail/invoice-detail.module').then( m => m.InvoiceDetailPageModule)
  },


];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }