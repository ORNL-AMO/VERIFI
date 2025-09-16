import { Component, Input } from '@angular/core';
import { PerformanceReport, PerformanceReportAnnualData } from 'src/app/calculations/performance-report-calculations/performanceReport';
import * as _ from 'lodash';
import { PerformanceReportSetup } from 'src/app/models/overview-report';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-performance-report-utility-table',
    templateUrl: './performance-report-utility-table.component.html',
    styleUrls: ['./performance-report-utility-table.component.css'],
    standalone: false
})
export class PerformanceReportUtilityTableComponent {
  @Input()
  performanceReport: PerformanceReport;
  @Input()
  account: IdbAccount;
  @Input()
  selectedAnalysisItem: IdbAccountAnalysisItem;
  @Input()
  performanceReportSetup: PerformanceReportSetup;

  savingsGoal: number;
  orderDataField: string = 'utilityClassification';
  orderByYear: number;
  orderByDirection: 'asc' | 'desc' = 'asc';
  units: string;
  numberOfData: number = 0;
  constructor() {

  }

  ngOnInit() {
    if (this.selectedAnalysisItem.analysisCategory == 'energy') {
      this.savingsGoal = this.account.sustainabilityQuestions.energyReductionPercent;
      this.units = this.selectedAnalysisItem.energyUnit;
    } else if (this.selectedAnalysisItem.analysisCategory == 'water') {
      this.savingsGoal = this.account.sustainabilityQuestions.waterReductionPercent;
      this.units = this.selectedAnalysisItem.waterUnit;
    }
    this.orderData();
    this.setNumberOfData();
  }

  setOrderDataField(str: string, year: number) {
    if (str == this.orderDataField && year == this.orderByYear) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
      this.orderByYear = year;
    }
    this.orderData();
  }

  orderData() {
    if (this.orderDataField == 'utilityClassification') {
      this.performanceReport.annualUtilityData = _.orderBy(this.performanceReport.annualUtilityData, (data: { utilityClassification: MeterSource | 'Mixed', annualData: Array<PerformanceReportAnnualData> }) => {
        return data.utilityClassification;
      }, this.orderByDirection);
    } else {
      this.performanceReport.annualUtilityData = _.orderBy(this.performanceReport.annualUtilityData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
        let yearSummary: PerformanceReportAnnualData = data.annualData.find(summary => { return summary.year == this.orderByYear })
        return yearSummary[this.orderDataField];
      }, this.orderByDirection);
    }
  }


  setNumberOfData() {
    this.numberOfData = 0;
    if (this.performanceReportSetup.includeActual) {
      this.numberOfData++;
    }
    if (this.performanceReportSetup.includeAdjusted) {
      this.numberOfData++;
    }
    if (this.performanceReportSetup.includeContribution) {
      this.numberOfData++;
    }
    if (this.performanceReportSetup.includeSavings) {
      this.numberOfData++;
    }
  }
}
