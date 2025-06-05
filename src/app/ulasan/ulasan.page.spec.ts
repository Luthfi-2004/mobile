import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UlasanPage } from './ulasan.page';

describe('UlasanPage', () => {
  let component: UlasanPage;
  let fixture: ComponentFixture<UlasanPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UlasanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
