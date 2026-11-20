import { Component, inject } from '@angular/core';
import { HomeContext } from '../home-context.service';

@Component({ selector: 'app-home-dashboard', standalone: false, templateUrl: './dashboard.component.html', styleUrls: ['./dashboard.component.css'] })
export class HomeDashboardComponent {
  readonly home = inject(HomeContext);
}
