import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReservasiJadwalPage } from './reservasi-jadwal.page';

describe('ReservasiJadwalPage', () => {
  let component: ReservasiJadwalPage;
  let fixture: ComponentFixture<ReservasiJadwalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReservasiJadwalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
