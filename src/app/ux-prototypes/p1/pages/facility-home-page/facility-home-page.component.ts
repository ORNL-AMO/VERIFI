import { Component, inject } from '@angular/core';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-facility-home-page',
  templateUrl: './facility-home-page.component.html',
  styleUrls: [
    '../../components/workspace-main/workspace-main.component.css',
    '../account-home-page/account-home-page.component.css'
  ],
  standalone: false
})
export class P1FacilityHomePageComponent {
  readonly facade = inject(P1RouteFacade);
}
