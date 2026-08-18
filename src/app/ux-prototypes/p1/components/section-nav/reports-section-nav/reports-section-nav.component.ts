import { Component, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';
import { accountNavCounts } from '../section-nav-content';

@Component({
  selector: 'app-p1-reports-section-nav',
  templateUrl: './reports-section-nav.component.html',
  standalone: false
})
export class P1ReportsSectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  get groups(): Array<P1NavGroup> {
    if (this.facade.contextMode() === 'facility') {
      return [{
        title: 'Facility Reports',
        items: [
          { id: 'overview-report', label: 'Overview report' },
          { id: 'analysis-report', label: 'Analysis report' },
          { id: 'quality-report', label: 'Data quality report' },
          { id: 'footprint-report', label: 'Footprint output' }
        ]
      }];
    }

    const counts = accountNavCounts(this.facade.accountFacilities());
    return [{
      title: 'Reports',
      items: [
        { id: 'setup', label: 'Report setup' },
        { id: 'data-checks', label: 'Data checks' },
        { id: 'generated', label: 'Generated reports', meta: String(counts.accountReports + counts.facilityReports) },
        { id: 'footprint-report', label: 'Footprint outputs' }
      ]
    }];
  }
}
