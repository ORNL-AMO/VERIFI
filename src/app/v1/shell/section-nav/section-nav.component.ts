import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

@Component({
  selector: 'app-section-nav',
  templateUrl: './section-nav.component.html',
  styleUrls: ['./section-nav.component.css'],
  standalone: false
})
export class SectionNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
}
