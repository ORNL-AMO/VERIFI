import { Component, Input } from '@angular/core';

/** Shared description and action header for facility-analysis result pages. */
@Component({
  selector: 'app-analysis-result-toolbar',
  standalone: true,
  templateUrl: './analysis-result-toolbar.component.html',
  styleUrls: ['./analysis-result-toolbar.component.css']
})
export class AnalysisResultToolbarComponent {
  @Input({ required: true }) description = '';
  @Input({ required: true }) ariaLabel = '';
}
