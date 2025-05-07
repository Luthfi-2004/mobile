import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReservasiPage } from './reservasi.page';

describe('ReservasiPage', () => {
  let component: ReservasiPage;
  let fixture: ComponentFixture<ReservasiPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReservasiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
