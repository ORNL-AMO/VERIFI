import { Component, inject } from '@angular/core';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { P1NavGroup, P1NavItem } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';
// import { accountNavCounts, toneForNavCount } from '../section-nav-content';

@Component({
  selector: 'app-p1-data-section-nav',
  templateUrl: './data-section-nav.component.html',
  standalone: false
})
export class P1DataSectionNavComponent {
  readonly facade = inject(P1RouteFacade);
  private readonly workspace = inject(AccountWorkspaceStore);

  get groups(): Array<P1NavGroup> {
    if (this.facade.contextMode() === 'facility') {
      return [{
        title: 'Facility Data',
        items: [
          {
            id: 'meters',
            label: 'Meters',
            meta: `${this.meterItems.length} total`,
            children: this.meterItems
          },
          { id: 'predictors', label: 'Predictors' },
          { id: 'energy-uses', label: 'Energy Uses' },
          { id: 'events', label: 'Events' }
        ]
      }];
    }

    // const counts = accountNavCounts(this.facade.accountFacilities());
    return [{
      title: 'Account Data',
      items: [
        { id: 'meters', label: 'Meters' },
        { id: 'predictors', label: 'Predictors' },
        { id: 'energy-uses', label: 'Energy Uses' },
        { id: 'events', label: 'Events' }
      ]
    }];
  }

  get meterItems(): Array<P1NavItem> {
    return this.workspace.facilityMeters()
      .map(meter => {
        const readingCount = this.workspace.facilityMeterData().filter(data => data.meterId === meter.guid).length;
        return {
          id: meter.guid,
          routeId: 'meters',
          label: meter.name,
          meta: `${readingCount} readings`,
          status: readingCount === 0 ? 'warning' : 'success',
          queryParams: { meter: meter.guid }
        } satisfies P1NavItem;
      })
      .sort((first, second) => first.label.localeCompare(second.label));
  }
}
