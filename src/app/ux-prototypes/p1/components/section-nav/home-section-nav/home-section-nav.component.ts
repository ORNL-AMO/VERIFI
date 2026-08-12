import { Component, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';
import { accountNavCounts, toneForNavCount } from '../section-nav-content';

@Component({
  selector: 'app-p1-home-section-nav',
  templateUrl: './home-section-nav.component.html',
  standalone: false
})
export class P1HomeSectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  get groups(): Array<P1NavGroup> {
    if (this.facade.contextMode() === 'facility') {
      const facility = this.facade.selectedFacility();
      const meterCount = facility?.meters ?? 0;
      return [{
        title: 'Facility Workspace',
        items: [
          { id: 'overview', label: 'Overview' },
          { id: 'progress', label: 'Facility progress', status: toneForNavCount(meterCount) },
          { id: 'activity', label: 'Workspace notes' }
        ]
      }];
    }

    const counts = accountNavCounts(this.facade.accountFacilities());
    return [{
      title: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview', meta: 'Portfolio' },
        { id: 'progress', label: 'Setup progress', status: toneForNavCount(counts.facilities) },
        { id: 'activity', label: 'Workspace notes' }
      ]
    }];
  }
}
