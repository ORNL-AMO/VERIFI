import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { Component, Input, inject } from '@angular/core';
import { PerformanceReport, PerformanceReportAnnualData } from '@domain/calculations/performance-report-calculations/performanceReport';
import * as _ from 'lodash';
import { AnalysisGroup } from '@data/models/analysis';
import { PerformanceReportSetup } from '@data/models/overview-report';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-performance-report-group-table',
    templateUrl: './performance-report-group-table.component.html',
    styleUrls: ['./performance-report-group-table.component.css'],
    standalone: false
})
export class PerformanceReportGroupTableComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
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
  numberOfData: number = 0;

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
      this.performanceReport.annualGroupData = _.orderBy(this.performanceReport.annualGroupData, (data: { facility: IdbFacility, group: AnalysisGroup, annualData: Array<PerformanceReportAnnualData> }) => {
        return data.facility.name;
      }, this.orderByDirection);
    } else if (this.orderDataField == 'state') {
      this.performanceReport.annualGroupData = _.orderBy(this.performanceReport.annualGroupData, (data: { facility: IdbFacility, group: AnalysisGroup, annualData: Array<PerformanceReportAnnualData> }) => {
        return data.facility.state;
      }, this.orderByDirection);
    } else if (this.orderDataField == 'groupName') {
      this.performanceReport.annualGroupData = _.orderBy(this.performanceReport.annualGroupData, (data: { facility: IdbFacility, group: AnalysisGroup, annualData: Array<PerformanceReportAnnualData> }) => {
        let name: string = this.accountWorkspaceQuery.getMeterGroupName(data.group.idbGroupId);
        return name;
      }, this.orderByDirection);
    } else {
      this.performanceReport.annualGroupData = _.orderBy(this.performanceReport.annualGroupData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
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
