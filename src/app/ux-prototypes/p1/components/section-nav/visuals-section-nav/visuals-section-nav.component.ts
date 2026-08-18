import { Component, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';

@Component({
  selector: 'app-p1-visuals-section-nav',
  templateUrl: './visuals-section-nav.component.html',
  standalone: false
})
export class P1VisualsSectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  get groups(): Array<P1NavGroup> {
    if (this.facade.contextMode() === 'facility') {
      return [{
        title: 'Facility Charts',
        items: [
          { id: 'time-series', label: 'Time series' },
          { id: 'correlation', label: 'Correlation plots' },
          { id: 'heatmap', label: 'Heatmaps' }
        ]
      }];
    }

    return [{
      title: 'Explore',
      items: [
        { id: 'time-series', label: 'Time series' },
        { id: 'trends', label: 'Utility trends' },
        { id: 'compare', label: 'Facility comparison' }
      ]
    }];
  }
}
