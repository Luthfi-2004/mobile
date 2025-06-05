import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BantuanPage } from './bantuan.page';

describe('BantuanPage', () => {
  let component: BantuanPage;
  let fixture: ComponentFixture<BantuanPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BantuanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
