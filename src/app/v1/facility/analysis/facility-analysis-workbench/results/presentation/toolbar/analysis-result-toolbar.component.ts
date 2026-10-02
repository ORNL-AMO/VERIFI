import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisResultDisplay } from '../facility-analysis-results-display.service';

/** Shared table/graph controls for facility-analysis result pages. */
@Component({
  selector: 'app-analysis-result-toolbar',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './analysis-result-toolbar.component.html',
  styleUrls: ['./analysis-result-toolbar.component.css']
})
export class AnalysisResultToolbarComponent {
  @Input({ required: true }) description = '';
  @Input({ required: true }) ariaLabel = '';
  @Input({ required: true }) display: AnalysisResultDisplay = 'table';
  @Output() readonly displayChanged = new EventEmitter<AnalysisResultDisplay>();
}
