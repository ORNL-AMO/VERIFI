import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../shell/workspace-navigation.service';

@Component({
  selector: 'app-guided-bills-entry',
  templateUrl: './guided-bills-entry.component.html',
  styleUrls: ['./guided-bills-entry.component.css'],
  standalone: false
})
export class GuidedBillsEntryComponent {
  readonly navigation = inject(WorkspaceNavigationService);

  openFullWorkspace(): void {
    const facility = this.navigation.facility();
    if (facility) {
      void this.navigation.openFacility(facility.guid);
    }
  }
}
