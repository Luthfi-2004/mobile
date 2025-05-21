import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

type Table = { id: string; full: boolean; seats: number; selected?: boolean };
type Section = 'indoor' | 'outdoor' | 'vvip';

@Component({
  selector: 'app-reservasi',
  templateUrl: './reservasi.page.html',
  styleUrls: ['./reservasi.page.scss'],
  standalone: false,
})
export class ReservasiPage {
  constructor(private navCtrl: NavController) {}

  sections: Section[] = ['indoor', 'outdoor', 'vvip'];

  tables: Record<Section, Table[]> = {
    indoor: [
      { id: 'A01', full: false, seats: 4 },
      { id: 'A02', full: false, seats: 2 },
      { id: 'A03', full: false, seats: 4 },
      { id: 'A04', full: true, seats: 2 },
      { id: 'A05', full: false, seats: 4 },
      { id: 'A06', full: false, seats: 2 },
      { id: 'A07', full: false, seats: 4 },
      { id: 'A08', full: true, seats: 2 }
    ],
    outdoor: [
      { id: 'B01', full: false, seats: 4 },
      { id: 'B02', full: true, seats: 2 },
      { id: 'B03', full: false, seats: 4 },
      { id: 'B04', full: false, seats: 2 },
      { id: 'B05', full: false, seats: 4 },
      { id: 'B06', full: true, seats: 2 },
      { id: 'B07', full: false, seats: 4 },
      { id: 'B08', full: false, seats: 2 }
    ],
    vvip: [
      { id: 'VVIP01', full: false, seats: 10 },
      { id: 'VVIP02', full: false, seats: 10 }
    ]
  };

  getNotes(section: Section): string {
    switch (section) {
      case 'indoor':
      case 'outdoor':
        return '1 Meja + 4/2 Kursi';
      case 'vvip':
        return '1 Meja + 10 Kursi';
      default:
        return '';
    }
  }

  selectTable(table: Table) {
    if (table.full) return;
    table.selected = !table.selected;
  }

  getSelectedTables(): Table[] {
    let selected: Table[] = [];
    for (const sec of this.sections) {
      selected = selected.concat(this.tables[sec].filter(t => t.selected));
    }
    return selected;
  }

  getTotalSelectedSeats(): number {
    return this.getSelectedTables().reduce((total, table) => total + table.seats, 0);
  }

  getSelectedSections(): string[] {
    const selectedSections = new Set<string>();
    this.getSelectedTables().forEach(table => {
      if (table.id.startsWith('A')) {
        selectedSections.add('INDOOR');
      } else if (table.id.startsWith('B')) {
        selectedSections.add('OUTDOOR');
      } else if (table.id.includes('VVIP')) {
        selectedSections.add('VVIP');
      }
    });
    return Array.from(selectedSections);
  }

  confirm() {
    const selectedTables = this.getSelectedTables();
    if (selectedTables.length === 0) {
      alert('Silakan pilih minimal 1 meja terlebih dahulu!');
      return;
    }

    const idMeja = selectedTables.map(t => t.id).join(','); // Gabung jika pilih lebih dari 1 meja
    const tempat = this.getSelectedSections().join(',');
    const jumlahKursi = this.getTotalSelectedSeats();

    this.navCtrl.navigateForward('/reservasi-jadwal', {
      queryParams: {
        idMeja,
        tempat,
        jumlahKursi
      }
    });
  }
}
