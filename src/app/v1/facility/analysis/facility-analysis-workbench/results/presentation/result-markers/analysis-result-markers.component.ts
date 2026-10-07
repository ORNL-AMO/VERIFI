import { Component, input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisResultMarker } from '../../../banking/facility-analysis-banking';

const MARKERS: Readonly<Record<AnalysisResultMarker, { readonly icon: 'piggyBank' | 'bank' | 'paintRoller' | 'star'; readonly label: string }>> = {
  'banked-source': { icon: 'piggyBank', label: 'Banked source period' },
  'banked-savings': { icon: 'bank', label: 'Banked savings added' },
  transition: { icon: 'paintRoller', label: 'Transition period' },
  model: { icon: 'star', label: 'Model period' }
};

@Component({
  selector: 'app-analysis-result-markers',
  standalone: true,
  imports: [IconComponent],
  template: `
    <span class="v1-result-markers">
      @for (marker of markers(); track marker) {
        <span class="v1-result-marker" [attr.aria-label]="details(marker).label" [title]="details(marker).label">
          <app-ui-icon [name]="details(marker).icon" [size]="16" [strokeWidth]="2"></app-ui-icon>
        </span>
      }
    </span>
  `,
  styles: [`
    :host { display: inline-flex; flex: none; align-items: center; margin-left: .4rem; vertical-align: middle; }
    .v1-result-markers { display: inline-flex; gap: .2rem; align-items: center; line-height: 1; }
    .v1-result-marker {
      display: inline-flex;
      width: 1rem;
      height: 1rem;
      align-items: center;
      justify-content: center;
      color: var(--v1-content-control);
    }
    .v1-result-marker app-ui-icon { display: inline-flex; }
  `]
})
export class AnalysisResultMarkersComponent {
  readonly markers = input.required<readonly AnalysisResultMarker[]>();
  readonly details = (marker: AnalysisResultMarker) => MARKERS[marker];
}

@Component({
  selector: 'app-analysis-result-marker-legend',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (markers().length) {
      <aside class="v1-result-marker-legend" aria-label="Result marker legend">
        @for (marker of markers(); track marker) {
          <span class="v1-result-marker-legend__item">
            <span class="v1-result-marker-legend__icon" aria-hidden="true">
              <app-ui-icon [name]="details(marker).icon" [size]="16" [strokeWidth]="2"></app-ui-icon>
            </span>
            <span>{{ details(marker).label }}</span>
          </span>
        }
      </aside>
    }
  `,
  styles: [`
    :host { display: block; }
    .v1-result-marker-legend { display: flex; flex-wrap: wrap; gap: .4rem .8rem; padding: .55rem .7rem; border-top: 1px solid var(--v1-divider); color: var(--v1-muted); font-size: .75rem; }
    .v1-result-marker-legend__item { display: inline-flex; gap: .35rem; align-items: center; line-height: 1.2; }
    .v1-result-marker-legend__icon {
      display: inline-flex;
      flex: 0 0 1rem;
      width: 1rem;
      height: 1rem;
      align-items: center;
      justify-content: center;
      color: var(--v1-content-control);
    }
    .v1-result-marker-legend__icon app-ui-icon { display: inline-flex; }
  `]
})
export class AnalysisResultMarkerLegendComponent {
  readonly markers = input.required<readonly AnalysisResultMarker[]>();
  readonly details = (marker: AnalysisResultMarker) => MARKERS[marker];
}
