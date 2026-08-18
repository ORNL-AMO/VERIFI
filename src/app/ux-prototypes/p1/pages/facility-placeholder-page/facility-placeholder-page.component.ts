import { Component, inject } from '@angular/core';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-facility-placeholder-page',
  templateUrl: './facility-placeholder-page.component.html',
  styleUrls: [
    '../../components/workspace-main/workspace-main.component.css',
    './facility-placeholder-page.component.css'
  ],
  standalone: false
})
export class P1FacilityPlaceholderPageComponent {
  readonly facade = inject(P1RouteFacade);
}
