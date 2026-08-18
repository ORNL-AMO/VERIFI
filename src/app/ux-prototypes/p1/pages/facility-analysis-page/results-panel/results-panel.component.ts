import { Component, Input } from '@angular/core';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';

@Component({
  selector: 'app-p1-facility-analysis-results-panel',
  templateUrl: './results-panel.component.html',
  styleUrls: ['../facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisResultsPanelComponent {
  @Input({ required: true }) analysis: IdbAnalysisItem;
  @Input() group: AnalysisGroup | undefined;
  @Input() level: 'group' | 'facility' = 'group';
  @Input() period: 'annual' | 'monthly' = 'annual';
  @Input() status: AnalysisStatusCheck | undefined;

  display: 'table' | 'graph' = 'table';
}
