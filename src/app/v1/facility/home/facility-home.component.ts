import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';

@Component({
  selector: 'app-workspace-facility-home',
  templateUrl: './facility-home.component.html',
  styleUrls: ['./facility-home.component.css'],
  standalone: false
})
export class FacilityHomeComponent {
  readonly navigation = inject(WorkspaceNavigationService);
}
