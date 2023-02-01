import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { IdbAccountReport, MeterSource } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { FacilityBarChartData } from 'src/app/models/visualization';

@Component({
  selector: 'app-facility-section-report',
  templateUrl: './facility-section-report.component.html',
  styleUrls: ['./facility-section-report.component.css']
})
export class FacilitySectionReportComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;
  @Input()
  facilityMeterSummaryData: FacilityMeterSummaryData;
  @Input()
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  @Input()
  facilityUtilityUsageSummaryData: UtilityUsageSummaryData;
  @Input()
  facilityYearMonthData: Array<YearMonthData>;

  sectionOptions: DataOverviewReportSetup;
  constructor(private accountReportDbService: AccountReportDbService) {
  }

  ngOnInit() {
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.sectionOptions = selectedReport.dataOverviewReportSetup;
  }
}
