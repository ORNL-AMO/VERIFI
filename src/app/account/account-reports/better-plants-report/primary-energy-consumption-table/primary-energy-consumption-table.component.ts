import { Component, Input, OnInit } from '@angular/core';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import * as _ from 'lodash';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
    selector: 'app-primary-energy-consumption-table',
    templateUrl: './primary-energy-consumption-table.component.html',
    styleUrls: ['./primary-energy-consumption-table.component.css'],
    standalone: false
})
export class PrimaryEnergyConsumptionTableComponent implements OnInit {
  @Input()
  report: IdbAccountReport;
  @Input()
  account: IdbAccount;
  @Input()
  betterPlantsSummary: BetterPlantsSummary;



  otherGasFuels: Array<string>;
  otherLiquidFuels: Array<string>;
  otherSolidFuels: Array<string>;
  otherEnergyFuels: Array<string>;
  baselineFiscalYearStart: Date;
  baselineFiscalYearEnd: Date;
  reportFiscalYearStart: Date;
  reportFiscalYearEnd: Date;
  constructor() { }

  ngOnInit(): void {
    this.setBaselineOtherFuels();
    if (this.account.fiscalYear == 'nonCalendarYear') {
      this.setFiscalYear();
    }
  }


  setBaselineOtherFuels() {
    this.otherGasFuels = _.uniq(this.betterPlantsSummary.baselineYearEnergyResults.otherGasFuels);
    this.otherLiquidFuels = _.uniq(this.betterPlantsSummary.baselineYearEnergyResults.otherLiquidFuels);
    this.otherSolidFuels = _.uniq(this.betterPlantsSummary.baselineYearEnergyResults.otherSolidFuels);
    this.otherEnergyFuels = _.uniq(this.betterPlantsSummary.baselineYearEnergyResults.otherEnergyTypes);
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
