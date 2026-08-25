import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';

@Component({
  selector: 'app-workspace-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css'],
  standalone: false
})
export class AccountHomeComponent {
  readonly navigation = inject(WorkspaceNavigationService);
}
