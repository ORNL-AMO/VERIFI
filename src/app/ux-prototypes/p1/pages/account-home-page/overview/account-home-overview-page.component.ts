import { Component, inject } from '@angular/core';
import { P1RouteFacade } from '../../../p1-route.facade';

@Component({
  selector: 'app-p1-account-home-overview-page',
  templateUrl: './account-home-overview-page.component.html',
  styleUrls: [
    '../../../components/workspace-main/workspace-main.component.css',
    '../account-home-page.component.css'
  ],
  standalone: false
})
export class P1AccountHomeOverviewPageComponent {
  readonly facade = inject(P1RouteFacade);
}
