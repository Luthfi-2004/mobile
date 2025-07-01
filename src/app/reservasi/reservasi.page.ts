import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { MejaService, Table } from '../services/meja.service';

type Section = 'indoor' | 'outdoor' | 'vvip';

@Component({
  selector: 'app-reservasi',
  templateUrl: './reservasi.page.html',
  styleUrls: ['./reservasi.page.scss'],
  standalone: false,
})
export class ReservasiPage implements OnInit {
  sections: Section[] = [];
  tables: Record<string, Table[]> = {};
  isLoading = false;
  showMapModal = false;

  constructor(
    private navCtrl: NavController,
    private mejaService: MejaService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.loadTables();
  }

  async loadTables() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading tables...'
    });
    await loading.present();

    this.mejaService.getTables().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tables = response.data;
          this.sections = Object.keys(response.data) as Section[];
        } else {
          this.showError('Failed to load tables');
        }
        loading.dismiss();
      },
      error: (error) => {
        console.error('Error loading tables:', error);
        this.showError('Failed to load tables');
        loading.dismiss();
      }
    });
  }

  async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  showMap() {
    this.showMapModal = true;
  }

  closeMap() {
    this.showMapModal = false;
  }

  getNotes(section: string): string {
    const tablesInSection = this.tables[section] || [];
    if (tablesInSection.length === 0) return '';
    const capacities = [...new Set(tablesInSection.map(t => t.seats))].sort();
    return `1 Meja + ${capacities.join('/')} Kursi`;
  }


  selectTable(table: Table) {
  // Cegah memilih meja nonaktif atau sudah penuh
  if (table.full || table.status === 'nonaktif') return;
  table.selected = !table.selected;
}

  getSelectedTables(): Table[] {
    let selected: Table[] = [];
    for (const section of this.sections) {
      const sectionTables = this.tables[section] || [];
      selected = selected.concat(sectionTables.filter(t => t.selected));
    }
    return selected;
  }

  getTotalSelectedSeats(): number {
    return this.getSelectedTables().reduce((total, table) => total + table.seats, 0);
  }

  getSelectedSections(): string[] {
    const selectedSections = new Set<string>();
    this.getSelectedTables().forEach(table => {
      for (const section of this.sections) {
        const sectionTables = this.tables[section] || [];
        if (sectionTables.some(t => t.id === table.id)) {
          selectedSections.add(section.toUpperCase());
          break;
        }
      }
    });
    return Array.from(selectedSections);
  }

  async confirm() {
    const selectedTables = this.getSelectedTables();
    if (selectedTables.length === 0) {
      const alert = await this.alertCtrl.create({
        header: 'Peringatan',
        message: 'Silakan pilih minimal 1 meja terlebih dahulu!',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Kirim array database_id (primary key) dari Table
    const idMejaArr: string[] = selectedTables.map(t => t.database_id.toString());
    const idMeja    = idMejaArr.join(',');    // misal "4,8,9"
    const tempat    = this.getSelectedSections().join(',');
    const jumlahKursi = this.getTotalSelectedSeats();

    this.navCtrl.navigateForward('/reservasi-jadwal', {
      queryParams: {
        idMeja,
        tempat,
        jumlahKursi
      }
    });
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'terisi': return 'Terisi';
      case 'dipesan': return 'Dipesan';
      case 'nonaktif': return 'Nonaktif';
      default: return 'Tersedia';
    }
  }

  async refreshTables() {
    await this.loadTables();
  }
}