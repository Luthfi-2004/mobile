import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Storage } from '@ionic/storage-angular'; // Jika ingin menyimpan preferensi tema

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentTheme: 'light' | 'dark' = 'light';
  private readonly THEME_KEY = 'app-theme'; // Kunci untuk penyimpanan

  constructor(
    rendererFactory: RendererFactory2,
    private storage: Storage // Inject Storage
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initStorage(); // Inisialisasi Storage
  }

  async initStorage() {
    await this.storage.create(); // Pastikan Storage terinisialisasi
    this.loadTheme(); // Muat tema saat aplikasi dimuat
  }

  async loadTheme() {
    const storedTheme = await this.storage.get(this.THEME_KEY);
    if (storedTheme) {
      this.setTheme(storedTheme);
    } else {
      // Deteksi tema sistem operasi sebagai default jika belum ada preferensi
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      if (prefersDark.matches) {
        this.setTheme('dark');
      } else {
        this.setTheme('light');
      }
    }
  }

  setTheme(theme: 'light' | 'dark') {
    this.currentTheme = theme;
    if (theme === 'dark') {
      this.renderer.addClass(document.body, 'dark-theme');
    } else {
      this.renderer.removeClass(document.body, 'dark-theme');
    }
    this.storage.set(this.THEME_KEY, theme); // Simpan preferensi tema
  }

  toggleTheme() {
    if (this.currentTheme === 'light') {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  getCurrentTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }
}