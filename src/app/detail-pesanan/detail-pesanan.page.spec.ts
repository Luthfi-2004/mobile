import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailPesananPage } from './detail-pesanan.page';

describe('DetailPesananPage', () => {
  let component: DetailPesananPage;
  let fixture: ComponentFixture<DetailPesananPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailPesananPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
