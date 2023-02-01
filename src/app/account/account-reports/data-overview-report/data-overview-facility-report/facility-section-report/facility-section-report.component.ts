import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { IdbAccountReport, IdbFacility, MeterSource } from 'src/app/models/idb';
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
  metersSummary: FacilityMeterSummaryData;
  @Input()
  monthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  @Input()
  utilityUsageSummaryData: UtilityUsageSummaryData;
  @Input()
  yearMonthData: Array<YearMonthData>;

  sectionOptions: DataOverviewReportSetup;
  waterUnit: string;
  energyUnit: string;
  constructor(private accountReportDbService: AccountReportDbService,
    private facilityDbService: FacilitydbService) {
  }

  ngOnInit() {
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.sectionOptions = selectedReport.dataOverviewReportSetup;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let facility: IdbFacility = accountFacilities.find(facility => { return facility.guid == this.facilityId })
    this.waterUnit = facility.volumeLiquidUnit;
    this.energyUnit = facility.energyUnit;
  }
}
