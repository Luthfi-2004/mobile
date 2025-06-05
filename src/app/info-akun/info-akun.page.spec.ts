import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoAkunPage } from './info-akun.page';

describe('InfoAkunPage', () => {
  let component: InfoAkunPage;
  let fixture: ComponentFixture<InfoAkunPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoAkunPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
