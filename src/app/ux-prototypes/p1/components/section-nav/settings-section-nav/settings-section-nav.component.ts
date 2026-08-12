import { Component, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';

@Component({
  selector: 'app-p1-settings-section-nav',
  templateUrl: './settings-section-nav.component.html',
  standalone: false
})
export class P1SettingsSectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  get groups(): Array<P1NavGroup> {
    const isFacility = this.facade.contextMode() === 'facility';
    return [{
      title: isFacility ? 'Facility Settings' : 'Account Settings',
      items: [
        { id: 'profile', label: isFacility ? 'Facility information' : 'Corporate information' },
        { id: 'units', label: 'Units and other impacts' },
        { id: 'goals', label: 'Reduction goals' },
        { id: 'financial', label: 'Financial reporting' },
        { id: 'staleness', label: 'Data staleness' },
        { id: 'backup', label: 'Backup and import', status: 'info' },
        { id: 'delete', label: isFacility ? 'Delete facility' : 'Delete account', status: 'danger' }
      ]
    }];
  }
}
