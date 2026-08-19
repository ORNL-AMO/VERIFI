import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { P1FacilityAnalysisRow, getP1AnalysisCategoryLabel } from '../facility-analysis-workbench.helpers';

@Component({
  selector: 'app-p1-facility-analysis-dashboard-list',
  templateUrl: './analysis-dashboard-list.component.html',
  styleUrls: ['../facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisDashboardListComponent {
  @Input({ required: true }) rows: P1FacilityAnalysisRow[] = [];
  @Input() canWrite = false;
  @Input() hasPending = false;
  @Input() compareGuids: string[] = [];

  @Output() openAnalysis = new EventEmitter<IdbAnalysisItem>();
  @Output() setActive = new EventEmitter<IdbAnalysisItem>();
  @Output() viewDetails = new EventEmitter<IdbAnalysisItem>();
  @Output() copyAnalysis = new EventEmitter<IdbAnalysisItem>();
  @Output() deleteAnalysis = new EventEmitter<P1FacilityAnalysisRow>();
  @Output() compareAnalysis = new EventEmitter<IdbAnalysisItem>();

  readonly categoryLabel = getP1AnalysisCategoryLabel;

  isCompared(analysisGuid: string): boolean {
    return this.compareGuids.includes(analysisGuid);
  }
}
