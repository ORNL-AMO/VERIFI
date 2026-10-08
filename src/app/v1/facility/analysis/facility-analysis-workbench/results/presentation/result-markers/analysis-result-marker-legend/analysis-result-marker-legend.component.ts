import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import {
  AnalysisResultMarker,
  orderedUniqueResultMarkers,
  resultMarkerDetails
} from '../analysis-result-markers';

@Component({
  selector: 'app-analysis-result-marker-legend',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './analysis-result-marker-legend.component.html',
  styleUrls: ['./analysis-result-marker-legend.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalysisResultMarkerLegendComponent {
  readonly markers = input.required<readonly AnalysisResultMarker[]>();
  readonly markerViews = computed(() => orderedUniqueResultMarkers(this.markers()).map(resultMarkerDetails));
}
