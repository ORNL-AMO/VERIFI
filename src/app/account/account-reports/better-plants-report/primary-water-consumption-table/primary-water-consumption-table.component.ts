import { Component, Input } from '@angular/core';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { BetterPlantsSummary } from 'src/app/models/overview-report';

@Component({
    selector: 'app-primary-water-consumption-table',
    templateUrl: './primary-water-consumption-table.component.html',
    styleUrls: ['./primary-water-consumption-table.component.css'],
    standalone: false
})
export class PrimaryWaterConsumptionTableComponent {
  @Input()
  report: IdbAccountReport;
  @Input()
  account: IdbAccount;
  @Input()
  betterPlantsSummary: BetterPlantsSummary;

  baselineFiscalYearStart: Date;
  baselineFiscalYearEnd: Date;
  reportFiscalYearStart: Date;
  reportFiscalYearEnd: Date;
  constructor() { }

  ngOnInit(): void {
    if (this.account.fiscalYear == 'nonCalendarYear') {
      this.setFiscalYear();
    }
  }


  setFiscalYear() {
    if (this.account.fiscalYearCalendarEnd) {
      this.baselineFiscalYearStart = new Date(this.report.baselineYear - 1, this.account.fiscalYearMonth);
      this.baselineFiscalYearEnd = new Date(this.report.baselineYear, this.account.fiscalYearMonth - 1);
      this.reportFiscalYearStart = new Date(this.betterPlantsSummary.reportYear - 1, this.account.fiscalYearMonth);
      this.reportFiscalYearEnd = new Date(this.betterPlantsSummary.reportYear, this.account.fiscalYearMonth - 1);
    } else {
      this.baselineFiscalYearStart = new Date(this.report.baselineYear, this.account.fiscalYearMonth);
      this.baselineFiscalYearEnd = new Date(this.report.baselineYear + 1, this.account.fiscalYearMonth - 1);
      this.reportFiscalYearStart = new Date(this.betterPlantsSummary.reportYear, this.account.fiscalYearMonth);
      this.reportFiscalYearEnd = new Date(this.betterPlantsSummary.reportYear + 1, this.account.fiscalYearMonth - 1);
    }
  }
}
