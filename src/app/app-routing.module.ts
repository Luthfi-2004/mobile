// src/app/app-routing.module.ts

import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    loadChildren: () =>
      import('./splash/splash.module').then(m => m.SplashPageModule)
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./login/login.module').then(m => m.LoginPageModule)
    // tidak ada guard agar bisa diakses tanpa login
  },
  {
    path: 'registrasi',
    loadChildren: () =>
      import('./registrasi/registrasi.module').then(m => m.RegistrasiPageModule)
    // tidak ada guard agar bisa diakses tanpa login
  },
  {
    path: 'forgot-password',
    loadChildren: () =>
      import('./forgot-password/forgot-password.module').then(
        m => m.ForgotPasswordPageModule
      )
    // halaman request reset password
  },
  {
    path: 'reset-password/:identifier',
    loadChildren: () =>
      import('./reset-password/reset-password.module').then(
        m => m.ResetPasswordPageModule
      )
    // halaman masukkan password baru, menerima parameter identifier
  },
  {
    path: 'tabs',
    loadChildren: () =>
      import('./tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'reservasi',
    loadChildren: () =>
      import('./reservasi/reservasi.module').then(
        m => m.ReservasiPageModule
      ),
    canActivate: [AuthGuard]
  },
  {
    path: 'reservasi-jadwal',
    loadChildren: () =>
      import('./reservasi-jadwal/reservasi-jadwal.module').then(
        m => m.ReservasiJadwalPageModule
      ),
    canActivate: [AuthGuard]
  },
  {
    path: 'menu',
    loadChildren: () =>
      import('./menu/menu.module').then(m => m.MenuPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'cart',
    loadChildren: () =>
      import('./cart/cart.module').then(m => m.CartPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'invoice',
    loadChildren: () =>
      import('./invoice/invoice.module').then(m => m.InvoicePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'invoice-detail/:reservasiId',
    loadChildren: () =>
      import('./invoice-detail/invoice-detail.module').then(
        m => m.InvoiceDetailPageModule
      ),
    canActivate: [AuthGuard]
  },
  {
    path: 'riwayat',
    loadChildren: () =>
      import('./riwayat/riwayat.module').then(m => m.RiwayatPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'detail-pesanan',
    loadChildren: () =>
      import('./detail-pesanan/detail-pesanan.module').then(
        m => m.DetailPesananPageModule
      ),
    canActivate: [AuthGuard]
  },
  {
    path: 'ulasan',
    loadChildren: () =>
      import('./ulasan/ulasan.module').then(m => m.UlasanPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'notifikasi',
    loadChildren: () =>
      import('./notifikasi/notifikasi.module').then(
        m => m.NotifikasiPageModule
      ),
    canActivate: [AuthGuard]
  },
  {
    path: 'akun',
    loadChildren: () =>
      import('./akun/akun.module').then(m => m.AkunPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'info-akun',
    loadChildren: () =>
      import('./info-akun/info-akun.module').then(
        m => m.InfoAkunPageModule
      ),
    canActivate: [AuthGuard]
  },
  {
    path: 'tentang-kami',
    loadChildren: () =>
      import('./tentang-kami/tentang-kami.module').then(
        m => m.TentangKamiPageModule
      )
    // publik
  },
  {
    path: 'bantuan',
    loadChildren: () =>
      import('./bantuan/bantuan.module').then(m => m.BantuanPageModule)
    // publik
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
