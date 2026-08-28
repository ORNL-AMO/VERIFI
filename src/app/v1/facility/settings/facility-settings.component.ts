import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';

@Component({
  selector: 'app-facility-settings-page',
  templateUrl: './facility-settings.component.html',
  styleUrls: ['./facility-settings.component.css'],
  standalone: false
})
export class FacilitySettingsComponent {
  private readonly workspace = inject(AccountWorkspaceStore);

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly facilities = this.workspace.facilities;
  readonly canWrite = this.workspace.canWrite;
  readonly isSingleSiteSetup = computed(() =>
    this.account()?.isSingleFacilityCompany === true && this.facilities().length === 1
  );
}
