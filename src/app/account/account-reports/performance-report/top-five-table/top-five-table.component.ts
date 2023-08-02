import { Component, Input } from '@angular/core';
import { PerformanceReport, PerformanceReportAnnualData } from 'src/app/calculations/performance-report-calculations/performanceReport';
import { IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AnalysisGroup } from 'src/app/models/analysis';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { PerformanceReportSetup } from 'src/app/models/overview-report';
@Component({
  selector: 'app-top-five-table',
  templateUrl: './top-five-table.component.html',
  styleUrls: ['./top-five-table.component.css']
})
export class TopFiveTableComponent {
  @Input()
  performanceReport: PerformanceReport;
  @Input()
  chartDataOption: 'savings' | 'contribution' | 'changeInContribution' | 'changeInAdjustedBaseline';
  @Input()
  dataType: 'facility' | 'group';
  @Input()
  performanceReportSetup: PerformanceReportSetup;

  tableData: Array<{
    order: number,
    highValueName: string,
    topValue: number,
    lowValueName: string,
    lowValue: number
  }>;
  valueLabel: 'Savings' | 'Contribution' | 'Production';
  orderDataField: string = 'order';
  orderByDirection: 'asc' | 'desc' = 'asc';
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService) {

  }

  ngOnInit() {
    if (this.chartDataOption == 'contribution' || this.chartDataOption == 'changeInContribution') {
      this.valueLabel = 'Contribution';
    } else if (this.chartDataOption == 'savings') {
      this.valueLabel = 'Savings';
    } else if (this.chartDataOption == 'changeInAdjustedBaseline') {
      this.valueLabel = 'Production';
    };
    if (this.dataType == 'facility') {
      this.setFacilityData();
    } else if (this.dataType == 'group') {
      this.setGroupData();
    }

  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  setFacilityData() {
    let annualFacilityData: Array<{
      facility: IdbFacility,
      annualData: Array<PerformanceReportAnnualData>
    }> = this.performanceReport.annualFacilityData.map(data => { return data });
    annualFacilityData = _.orderBy(annualFacilityData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
      let yearSummary: PerformanceReportAnnualData = data.annualData.find(summary => { return summary.year == this.performanceReport.reportYear })
      return yearSummary[this.chartDataOption];
    }, 'desc');
    this.tableData = new Array();
    for (let i = 0; i < this.performanceReportSetup.numberOfTopPerformers; i++) {
      let topFacilityItem: {
        facility: IdbFacility, annualData: Array<PerformanceReportAnnualData>
      } = annualFacilityData[i];

      let topFacilityName: string;
      let topValue: number;
      if (topFacilityItem) {
        let yearSummary: PerformanceReportAnnualData = topFacilityItem.annualData.find(data => { return data.year == this.performanceReport.reportYear });
        topFacilityName = topFacilityItem.facility.name;
        topValue = yearSummary[this.chartDataOption];
      }
      let lowFacilityItem: {
        facility: IdbFacility, annualData: Array<PerformanceReportAnnualData>
      } = annualFacilityData[annualFacilityData.length - (i + 1)];
      let lowFacilityName: string;
      let lowValue: number;
      if (lowFacilityItem) {
        let yearSummary: PerformanceReportAnnualData = lowFacilityItem.annualData.find(data => { return data.year == this.performanceReport.reportYear });
        lowFacilityName = lowFacilityItem.facility.name;
        lowValue = yearSummary[this.chartDataOption];
      }
      this.tableData.push({
        order: i + 1,
        highValueName: topFacilityName,
        topValue: topValue,
        lowValueName: lowFacilityName,
        lowValue: lowValue
      });
    }
  }

  setGroupData() {
    let annualGroupData: Array<{
      facility: IdbFacility,
      group: AnalysisGroup,
      annualData: Array<PerformanceReportAnnualData>
    }> = this.performanceReport.annualGroupData.map(data => { return data });
    annualGroupData = _.orderBy(this.performanceReport.annualGroupData, (data: { facility: IdbFacility, annualData: Array<PerformanceReportAnnualData> }) => {
      let yearSummary: PerformanceReportAnnualData = data.annualData.find(summary => { return summary.year == this.performanceReport.reportYear })
      return yearSummary[this.chartDataOption];
    }, 'desc');


    this.tableData = new Array();
    for (let i = 0; i < this.performanceReportSetup.numberOfTopPerformers; i++) {
      let topItem: {
        facility: IdbFacility, annualData: Array<PerformanceReportAnnualData>, group: AnalysisGroup
      } = annualGroupData[i];

      let highValueName: string;
      let topValue: number;
      if (topItem) {
        let yearSummary: PerformanceReportAnnualData = topItem.annualData.find(data => { return data.year == this.performanceReport.reportYear });
        let groupName: string = this.utilityMeterGroupDbService.getGroupName(topItem.group.idbGroupId);
        highValueName = topItem.facility.name + ' (' + groupName + ')';
        topValue = yearSummary[this.chartDataOption];
      }
      let lowItem: {
        facility: IdbFacility, annualData: Array<PerformanceReportAnnualData>, group: AnalysisGroup
      } = annualGroupData[annualGroupData.length - (i + 1)];
      let lowFacilityName: string;
      let lowValue: number;
      if (lowItem) {
        let yearSummary: PerformanceReportAnnualData = lowItem.annualData.find(data => { return data.year == this.performanceReport.reportYear });
        let groupName: string = this.utilityMeterGroupDbService.getGroupName(lowItem.group.idbGroupId);
        lowFacilityName = lowItem.facility.name + ' (' + groupName + ')';
        lowValue = yearSummary[this.chartDataOption];
      }
      this.tableData.push({
        order: i + 1,
        highValueName: highValueName,
        topValue: topValue,
        lowValueName: lowFacilityName,
        lowValue: lowValue
      });
    }
  }

}
