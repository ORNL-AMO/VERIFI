import { Component, Input, OnInit } from '@angular/core';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import * as _ from 'lodash';

@Component({
  selector: 'app-primary-energy-consumption-table',
  templateUrl: './primary-energy-consumption-table.component.html',
  styleUrls: ['./primary-energy-consumption-table.component.css']
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
    console.log(this.otherGasFuels)
    this.otherLiquidFuels = _.uniq(this.betterPlantsSummary.baselineYearEnergyResults.otherLiquidFuels);
    this.otherSolidFuels = _.uniq(this.betterPlantsSummary.baselineYearEnergyResults.otherSolidFuels);
    this.otherEnergyFuels = _.uniq(this.betterPlantsSummary.baselineYearEnergyResults.otherEnergyTypes);
  }

  setFiscalYear() {
    if (this.account.fiscalYearCalendarEnd) {
      this.baselineFiscalYearStart = new Date(this.report.baselineYear - 1, this.account.fiscalYearMonth);
      this.baselineFiscalYearEnd = new Date(this.report.baselineYear, this.account.fiscalYearMonth - 1);
      this.reportFiscalYearStart = new Date(this.report.reportYear - 1, this.account.fiscalYearMonth);
      this.reportFiscalYearEnd = new Date(this.report.reportYear, this.account.fiscalYearMonth - 1);
    } else {
      this.baselineFiscalYearStart = new Date(this.report.baselineYear, this.account.fiscalYearMonth);
      this.baselineFiscalYearEnd = new Date(this.report.baselineYear + 1, this.account.fiscalYearMonth - 1);
      this.reportFiscalYearStart = new Date(this.report.reportYear, this.account.fiscalYearMonth);
      this.reportFiscalYearEnd = new Date(this.report.reportYear + 1, this.account.fiscalYearMonth - 1);
    }

  }

}
