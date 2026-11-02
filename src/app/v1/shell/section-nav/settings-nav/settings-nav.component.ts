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
  readonly settingsTitle = computed(() => this.navigation.isSingleSiteWorkspace() ? 'Settings' : this.navigation.contextFacility() ? 'Facility Settings' : 'Account Settings');
  readonly settingsItems = computed(() => settingsNavItems(
    !!this.navigation.singleFacilityContext() || !!this.navigation.contextFacility(), !!this.navigation.account()?.isSingleFacilityCompany
  ).map(item => {
    const facility = this.navigation.singleFacilityContext() ?? this.navigation.contextFacility();
    const account = this.navigation.account();
    return {
      ...item,
      active: this.navigation.activeDetail() === item.id,
      route: facility
        ? this.navigation.facilitySettingsRoute(facility.guid, item.id)
        : account ? this.navigation.accountSettingsRoute(account.guid, item.id) : []
    };
  }));
}
