import { Component, Input } from '@angular/core';
import { PerformanceReport, PerformanceReportAnnualData } from 'src/app/calculations/performance-report-calculations/performanceReport';
import { IdbAccount, IdbAccountAnalysisItem, IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { PerformanceReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-performance-report-facility-table',
  templateUrl: './performance-report-facility-table.component.html',
  styleUrls: ['./performance-report-facility-table.component.css']
})
export class PerformanceReportFacilityTableComponent {
  @Input()
  performanceReport: PerformanceReport;
  @Input()
  account: IdbAccount;
  @Input()
  selectedAnalysisItem: IdbAccountAnalysisItem;
  @Input()
  performanceReportSetup: PerformanceReportSetup;

  savingsGoal: number;
  orderDataField: string = 'facilityName';
  orderByYear: number;
  orderByDirection: 'asc' | 'desc' = 'asc';
  units: string;
  numberOfData: number;
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
    if (this.orderDataField == 'facilityName') {
      this.performanceReport.annualFacilityData = _.orderBy(this.performanceReport.annualFacilityData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
        return data.facility.name;
      }, this.orderByDirection);
    } else if (this.orderDataField == 'state') {
      this.performanceReport.annualFacilityData = _.orderBy(this.performanceReport.annualFacilityData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
        return data.facility.state;
      }, this.orderByDirection);
    } else {
      this.performanceReport.annualFacilityData = _.orderBy(this.performanceReport.annualFacilityData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
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
