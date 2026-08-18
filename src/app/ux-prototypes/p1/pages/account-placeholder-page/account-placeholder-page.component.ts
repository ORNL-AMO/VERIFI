import { Component, inject } from '@angular/core';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-account-placeholder-page',
  templateUrl: './account-placeholder-page.component.html',
  styleUrls: [
    '../../components/workspace-main/workspace-main.component.css',
    './account-placeholder-page.component.css'
  ],
  standalone: false
})
export class P1AccountPlaceholderPageComponent {
  readonly facade = inject(P1RouteFacade);
}
