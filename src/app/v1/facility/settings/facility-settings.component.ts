import { Component, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';

@Component({
  selector: 'app-facility-settings-page',
  templateUrl: './facility-settings.component.html',
  styleUrls: ['./facility-settings.component.css'],
  standalone: false
})
export class FacilitySettingsComponent {
  private readonly workspace = inject(AccountWorkspaceStore);

  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
}
