import { Component, Input, output } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings, getAnalysisReportSettings } from 'src/app/models/idbModels/facilityReport';

@Component({
    selector: 'app-select-banked-analysis',
    templateUrl: './select-banked-analysis.component.html',
    styleUrl: './select-banked-analysis.component.css',
    standalone: false
})
export class SelectBankedAnalysisComponent {
  @Input({ required: true }) facilityAnalysisItems: Array<IdbAnalysisItem>;
  @Input({ required: true }) analysisItem: IdbAnalysisItem;
  @Input({ required: true }) facility: IdbFacility;
  @Input() disabled: boolean;

  readonly bankedItemSelected = output<string>();

  showDetail = false;
  quickReportItem: IdbAnalysisItem;
  quickReportSettings: AnalysisReportSettings = getAnalysisReportSettings();
  displayQuickReport = false;

  selectItem(guid: string): void {
    this.bankedItemSelected.emit(guid);
  }

  viewQuickReport(analysisItem: IdbAnalysisItem): void {
    this.quickReportItem = analysisItem;
    this.displayQuickReport = true;
  }

  hideQuickReport(): void {
    this.displayQuickReport = false;
  }
}
