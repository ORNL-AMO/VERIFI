import { Component, Input } from '@angular/core';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-p1-facility-analysis-references-panel',
  templateUrl: './references-panel.component.html',
  styleUrls: ['../facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisReferencesPanelComponent {
  @Input({ required: true }) analysis: IdbAnalysisItem;
  @Input() accountAnalyses: IdbAccountAnalysisItem[] = [];
  @Input() reports: IdbFacilityReport[] = [];
}
