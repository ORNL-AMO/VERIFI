import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

@Component({
  selector: 'app-workspace-shell',
  templateUrl: './workspace-shell.component.html',
  styleUrls: ['./workspace-shell.component.css'],
  standalone: false
})
export class WorkspaceShellComponent {
  readonly navigation = inject(WorkspaceNavigationService);
}
