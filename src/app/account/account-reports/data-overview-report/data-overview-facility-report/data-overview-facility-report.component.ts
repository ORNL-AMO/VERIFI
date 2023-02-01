import { Component, Input } from '@angular/core';
import { FacilitySummaryClass } from 'src/app/calculations/dashboard-calculations/facilitySummaryClass';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { AllSources, EnergySources, IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup, MeterSource, WaterSources } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-data-overview-facility-report',
  templateUrl: './data-overview-facility-report.component.html',
  styleUrls: ['./data-overview-facility-report.component.css']
})
export class DataOverviewFacilityReportComponent {
  @Input()
  facilityId: string;
  @Input()
  overviewReport: DataOverviewReportSetup;

  calculating: boolean = true;
  worker: Worker;
  noUtilityData: boolean;
  facility: IdbFacility;
  calanderizedMeters: Array<CalanderizedMeter>;
  energyMeterSummaryData: FacilityMeterSummaryData;
  energyMonthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  energyUtilityUsageSummaryData: UtilityUsageSummaryData;
  energyYearMonthData: Array<YearMonthData>;


  costsMeterSummaryData: FacilityMeterSummaryData;
  costsMonthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  costsUtilityUsageSummaryData: UtilityUsageSummaryData;
  costsYearMonthData: Array<YearMonthData>;

  waterMeterSummaryData: FacilityMeterSummaryData;
  waterMonthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  waterUtilityUsageSummaryData: UtilityUsageSummaryData;
  waterYearMonthData: Array<YearMonthData>;
  constructor(private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.facility = accountFacilities.find(facility => { return facility.guid == this.facilityId });
    this.facilityOverviewService.emissionsDisplay.next(this.overviewReport.emissionsDisplay);
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facilityId });
    this.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false, true, { energyIsSource: this.overviewReport.energyIsSource });
    if (this.calanderizedMeters.length != 0) {
      this.noUtilityData = false;
      this.calculateFacilitiesSummary();
    } else {
      this.noUtilityData = true;
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  calculateFacilitiesSummary() {
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == this.facilityId });
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (data.type == 'energy') {
          this.energyMeterSummaryData = data.meterSummaryData;
          this.energyMonthlySourceData = data.monthlySourceData;
          this.energyUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.energyYearMonthData = data.yearMonthData;
        } else if (data.type == 'water') {
          this.waterMeterSummaryData = data.meterSummaryData;
          this.waterMonthlySourceData = data.monthlySourceData;
          this.waterUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.waterYearMonthData = data.yearMonthData;
        } else if (data.type == 'all') {
          this.costsMeterSummaryData = data.meterSummaryData;
          this.costsMonthlySourceData = data.monthlySourceData;
          this.costsUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.costsYearMonthData = data.yearMonthData;
          this.calculating = false;
          this.worker.terminate();
        }
      };
      let energySources: Array<MeterSource> = EnergySources;
      this.worker.postMessage({
        calanderizedMeters: this.calanderizedMeters,
        groups: facilityGroups,
        sources: energySources,
        type: 'energy',
        facility: this.facility
      });

      let waterSources: Array<MeterSource> = WaterSources;
      this.worker.postMessage({
        calanderizedMeters: this.calanderizedMeters,
        groups: facilityGroups,
        sources: waterSources,
        type: 'water',
        facility: this.facility
      });

      let allSources: Array<MeterSource> = AllSources;
      this.worker.postMessage({
        calanderizedMeters: this.calanderizedMeters,
        groups: facilityGroups,
        sources: allSources,
        type: 'all',
        facility: this.facility
      });
    } else {
      // Web Workers are not supported in this environment.
      let energySources: Array<MeterSource> = EnergySources;
      let facilitySummaryClass: FacilitySummaryClass = new FacilitySummaryClass(this.calanderizedMeters, facilityGroups, energySources, this.facility);
      this.energyMeterSummaryData = facilitySummaryClass.meterSummaryData;
      this.energyMonthlySourceData = facilitySummaryClass.monthlySourceData;
      this.energyUtilityUsageSummaryData = facilitySummaryClass.utilityUsageSummaryData;
      this.energyYearMonthData = facilitySummaryClass.yearMonthData;

      let waterSources: Array<MeterSource> = WaterSources;
      let waterSummaryClass: FacilitySummaryClass = new FacilitySummaryClass(this.calanderizedMeters, facilityGroups, waterSources, this.facility);
      this.waterMeterSummaryData = waterSummaryClass.meterSummaryData;
      this.waterMonthlySourceData = waterSummaryClass.monthlySourceData;
      this.waterUtilityUsageSummaryData = waterSummaryClass.utilityUsageSummaryData;
      this.waterYearMonthData = waterSummaryClass.yearMonthData;
      
      let allSources: Array<MeterSource> = AllSources;
      let allSourcesSummaryClass: FacilitySummaryClass = new FacilitySummaryClass(this.calanderizedMeters, facilityGroups, allSources, this.facility);
      this.costsMeterSummaryData = allSourcesSummaryClass.meterSummaryData;
      this.costsMonthlySourceData = allSourcesSummaryClass.monthlySourceData;
      this.costsUtilityUsageSummaryData = allSourcesSummaryClass.utilityUsageSummaryData;
      this.costsYearMonthData = allSourcesSummaryClass.yearMonthData;
      this.calculating = false;
    }
  }


}
