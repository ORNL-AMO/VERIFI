import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Input({ required: true })
  facilityAnalysisItems: Array<IdbAnalysisItem>;
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  facility: IdbFacility;
  @Input()
  disabled: boolean;
  @Output('emitSave')
  emitSave: EventEmitter<boolean> = new EventEmitter();

  showDetail: boolean = false;

  quickReportItem: IdbAnalysisItem;
  quickReportSettings: AnalysisReportSettings = getAnalysisReportSettings();
  displayQuickReport: boolean = false;
  save() {
    this.emitSave.emit(true);
  }

  viewQuickReport(analysisItem: IdbAnalysisItem){
    this.quickReportItem = analysisItem;
    this.displayQuickReport = true;
  }

  hideQuickReport(){
    this.displayQuickReport = false;
  }
  
}
