import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false
})
export class TabsPage {
  constructor(private router: Router) {}

  handleInvoiceClick() {
    this.router.navigate(['/invoice']);
  }
}
