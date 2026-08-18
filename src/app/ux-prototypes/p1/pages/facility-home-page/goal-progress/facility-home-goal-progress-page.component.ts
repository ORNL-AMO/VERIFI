import { Component, inject } from '@angular/core';
import { P1RouteFacade } from '../../../p1-route.facade';

@Component({
  selector: 'app-p1-facility-home-goal-progress-page',
  templateUrl: './facility-home-goal-progress-page.component.html',
  styleUrls: [
    '../../../components/workspace-main/workspace-main.component.css',
    '../../account-home-page/account-home-page.component.css'
  ],
  standalone: false
})
export class P1FacilityHomeGoalProgressPageComponent {
  readonly facade = inject(P1RouteFacade);
}
