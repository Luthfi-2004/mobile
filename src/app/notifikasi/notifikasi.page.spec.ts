import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotifikasiPage } from './notifikasi.page';

describe('NotifikasiPage', () => {
  let component: NotifikasiPage;
  let fixture: ComponentFixture<NotifikasiPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NotifikasiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
