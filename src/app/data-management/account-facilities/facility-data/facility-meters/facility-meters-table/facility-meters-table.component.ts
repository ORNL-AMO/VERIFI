import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-facility-meters-table',
  templateUrl: './facility-meters-table.component.html',
  styleUrl: './facility-meters-table.component.css',
  standalone: false
})
export class FacilityMetersTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  selectedFacility = this.accountWorkspaceStore.selectedFacility;
}
