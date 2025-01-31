import { Component, Input } from '@angular/core';
import { SEPReport } from 'src/app/calculations/facility-reports/sepReport';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-sep-results-table',
  templateUrl: './sep-results-table.component.html',
  styleUrl: './sep-results-table.component.css',
  standalone: false
})
export class SepResultsTableComponent {
  @Input({ required: true })
  sepReport: SEPReport;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;

  baselineFiscalYearStart: Date;
  baselineFiscalYearEnd: Date;
  reportFiscalYearStart: Date;
  reportFiscalYearEnd: Date;

  ngOnInit() {
    this.setFiscalYear();
  }


  setFiscalYear() {
    if (this.facility.fiscalYearCalendarEnd) {
      this.baselineFiscalYearStart = new Date(this.analysisItem.baselineYear - 1, this.facility.fiscalYearMonth);
      this.baselineFiscalYearEnd = new Date(this.analysisItem.baselineYear, this.facility.fiscalYearMonth - 1);
      this.reportFiscalYearStart = new Date(this.analysisItem.reportYear - 1, this.facility.fiscalYearMonth);
      this.reportFiscalYearEnd = new Date(this.analysisItem.reportYear, this.facility.fiscalYearMonth - 1);
    } else {
      this.baselineFiscalYearStart = new Date(this.analysisItem.baselineYear, this.facility.fiscalYearMonth);
      this.baselineFiscalYearEnd = new Date(this.analysisItem.baselineYear + 1, this.facility.fiscalYearMonth - 1);
      this.reportFiscalYearStart = new Date(this.analysisItem.reportYear, this.facility.fiscalYearMonth);
      this.reportFiscalYearEnd = new Date(this.analysisItem.reportYear + 1, this.facility.fiscalYearMonth - 1);
    }
  }
}
