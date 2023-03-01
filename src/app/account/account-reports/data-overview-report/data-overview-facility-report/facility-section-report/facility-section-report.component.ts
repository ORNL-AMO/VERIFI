import { Component, Input } from '@angular/core';
import { AnnualSourceData, FacilityOverviewData, FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { YearMonthData } from 'src/app/models/dashboard';
import { IdbAccountReport, IdbFacility } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-facility-section-report',
  templateUrl: './facility-section-report.component.html',
  styleUrls: ['./facility-section-report.component.css']
})
export class FacilitySectionReportComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facility: IdbFacility;
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;
  @Input()
  yearMonthData: Array<YearMonthData>;
  @Input()
  annualSourceData: Array<AnnualSourceData>;
  @Input()
  facilityOverviewMeters: Array<FacilityOverviewMeter>;
  @Input()
  facilityOverviewData: FacilityOverviewData;
  @Input()
  sourcesUseAndCost: Array<UseAndCost>;
  @Input()
  useAndCostTotal: {
      end: IUseAndCost;
      average: IUseAndCost;
      previousYear: IUseAndCost;
  };
  @Input()
  dateRange: {startDate: Date, endDate: Date};
  @Input()
  previousYear: Date;

  sectionOptions: DataOverviewReportSetup;
  waterUnit: string;
  energyUnit: string;
  constructor(private accountReportDbService: AccountReportDbService) {
  }

  ngOnInit() {
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.sectionOptions = selectedReport.dataOverviewReportSetup;
    this.waterUnit = this.facility.volumeLiquidUnit;
    this.energyUnit = this.facility.energyUnit;
  }
}
