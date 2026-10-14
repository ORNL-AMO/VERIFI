import { Component, computed, inject } from '@angular/core';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { settingsNavItems } from '../models';
@Component({
  selector: 'app-settings-nav',
  templateUrl: './settings-nav.component.html',
  styleUrls: ['./settings-nav.component.css'],
  standalone: false
})
export class SettingsNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly settingsTitle = computed(() => this.navigation.contextMode() === 'facility' ? 'Facility Settings' : 'Account Settings');
  readonly settingsItems = computed(() => settingsNavItems(
    this.navigation.contextMode() === 'facility', !!this.navigation.account()?.isSingleFacilityCompany
  ).map(item => {
    const facility = this.navigation.facility();
    const account = this.navigation.account();
    return {
      ...item,
      active: this.navigation.activeDetail() === item.id,
      route: this.navigation.contextMode() === 'facility' && facility
        ? this.navigation.facilitySettingsRoute(facility.guid, item.id)
        : account ? this.navigation.accountSettingsRoute(account.guid, item.id) : []
    };
  }));
}
