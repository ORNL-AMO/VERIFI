import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import {
  AnalysisResultMarker,
  resultMarkerDetails
} from '../analysis-result-markers';

@Component({
  selector: 'app-analysis-result-markers',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './analysis-result-markers.component.html',
  styleUrls: ['./analysis-result-markers.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalysisResultMarkersComponent {
  readonly markers = input.required<readonly AnalysisResultMarker[]>();
  readonly markerViews = computed(() => this.markers().map(resultMarkerDetails));
}
