import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvoiceDetailPage } from './invoice-detail.page';

describe('InvoiceDetailPage', () => {
  let component: InvoiceDetailPage;
  let fixture: ComponentFixture<InvoiceDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InvoiceDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
