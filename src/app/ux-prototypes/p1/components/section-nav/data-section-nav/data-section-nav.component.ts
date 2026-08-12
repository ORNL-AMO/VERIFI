import { Component, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';
// import { accountNavCounts, toneForNavCount } from '../section-nav-content';

@Component({
  selector: 'app-p1-data-section-nav',
  templateUrl: './data-section-nav.component.html',
  standalone: false
})
export class P1DataSectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  get groups(): Array<P1NavGroup> {
    if (this.facade.contextMode() === 'facility') {
      // const facility = this.facade.selectedFacility();
      return [{
        title: 'Facility Data',
        items: [
          { id: 'meters', label: 'Meters' },
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
}
