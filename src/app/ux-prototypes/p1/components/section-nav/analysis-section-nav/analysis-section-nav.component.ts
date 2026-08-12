import { Component, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';
import { accountNavCounts, toneForNavCount } from '../section-nav-content';

@Component({
  selector: 'app-p1-analysis-section-nav',
  templateUrl: './analysis-section-nav.component.html',
  standalone: false
})
export class P1AnalysisSectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  get groups(): Array<P1NavGroup> {
    if (this.facade.contextMode() === 'facility') {
      const facility = this.facade.selectedFacility();
      return [{
        title: 'Facility Analysis',
        items: [
          { id: 'setup', label: 'Analysis setup', status: toneForNavCount(facility?.analyses ?? 0) },
          { id: 'results', label: 'Results' },
          { id: 'footprint-analysis', label: 'Footprint analysis' }
        ]
      }];
    }

    const counts = accountNavCounts(this.facade.accountFacilities());
    return [{
      title: 'Account Analysis',
      items: [
        { id: 'rollup', label: 'Account rollup', status: toneForNavCount(counts.facilities) },
        { id: 'savings', label: 'Savings summary' },
        { id: 'footprint-analysis', label: 'Footprint analysis' }
      ]
    }];
  }
}
