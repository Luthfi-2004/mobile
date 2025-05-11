import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TentangKamiPage } from './tentang-kami.page';

describe('TentangKamiPage', () => {
  let component: TentangKamiPage;
  let fixture: ComponentFixture<TentangKamiPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TentangKamiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
