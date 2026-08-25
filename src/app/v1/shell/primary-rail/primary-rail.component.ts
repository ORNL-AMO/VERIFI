import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

@Component({
  selector: 'app-primary-rail',
  templateUrl: './primary-rail.component.html',
  styleUrls: ['./primary-rail.component.css'],
  standalone: false
})
export class PrimaryRailComponent {
  readonly navigation = inject(WorkspaceNavigationService);
}
