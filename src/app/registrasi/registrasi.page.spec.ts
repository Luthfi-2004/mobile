import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistrasiPage } from './registrasi.page';

describe('RegistrasiPage', () => {
  let component: RegistrasiPage;
  let fixture: ComponentFixture<RegistrasiPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrasiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
