import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { P1FacilityAnalysisRow, getP1AnalysisCategoryLabel, getP1AnalysisTypeLabel } from '../facility-analysis-workbench.helpers';

@Component({
  selector: 'app-p1-facility-analysis-detail-summary',
  templateUrl: './analysis-detail-summary.component.html',
  styleUrls: ['../facility-analysis-page.component.css', './analysis-detail-summary.component.css'],
  standalone: false
})
export class P1FacilityAnalysisDetailSummaryComponent {
  @Input() row: P1FacilityAnalysisRow | undefined;
  @Output() closeSummary = new EventEmitter<void>();
  @Output() openAnalysis = new EventEmitter<IdbAnalysisItem>();

  readonly categoryLabel = getP1AnalysisCategoryLabel;
  readonly typeLabel = getP1AnalysisTypeLabel;
}
