import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityReportsService } from '../../facility-reports.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';

@Component({
    selector: 'app-facility-overview-report-results',
    templateUrl: './facility-overview-report-results.component.html',
    styleUrl: './facility-overview-report-results.component.css',
    standalone: false
})
export class FacilityOverviewReportResultsComponent {

  facilityReport: IdbFacilityReport;
  overviewReportSettings: DataOverviewFacilityReportSettings;
  facilityReportSub: Subscription;

  print: boolean;
  printSub: Subscription;

  facility: IdbFacility;
  calanderizedMeters: Array<CalanderizedMeter>;
  dateRange: {
    startDate: Date,
    endDate: Date
  };
  facilityOverviewData: FacilityOverviewData;
  utilityUseAndCost: UtilityUseAndCost;
  worker: Worker;
  calculating: boolean | 'error' = true;
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private facilityReportsService: FacilityReportsService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private customFuelDbService: CustomFuelDbService,
    private eGridService: EGridService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.overviewReportSettings = this.facilityReport.dataOverviewReportSettings;
      this.calculateFacilitiesSummary();
    });
    this.printSub = this.facilityReportsService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.printSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  calculateFacilitiesSummary() {
    this.calculating = true;
    this.facility = this.facilityDbService.getFacilityById(this.facilityReport.facilityId);
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.facilityReport.facilityId);
    if (this.overviewReportSettings.includeAllMeterData == false) {
      let includeGroupIds: Array<string> = [];
      this.overviewReportSettings.includedGroups.forEach(group => {
        if(group.include){
          includeGroupIds.push(group.groupId);
        }
      });
      facilityMeters = facilityMeters.filter(meter => {
        return includeGroupIds.includes(meter.groupId);
      });
    };
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
    this.dateRange = {
      startDate: new Date(this.overviewReportSettings.startYear, this.overviewReportSettings.startMonth, 1),
      endDate: new Date(this.overviewReportSettings.endYear, this.overviewReportSettings.endMonth, 1)
    }
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityOverviewData = data.facilityOverviewData;
          this.utilityUseAndCost = data.utilityUseAndCost;
          this.calanderizedMeters = data.calanderizedMeters;
          this.calculating = false;
        } else {
          this.calculating = 'error';
        }
      };

      this.worker.postMessage({
        type: 'overview',
        dateRange: this.dateRange,
        facility: this.facility,
        energyIsSource: this.overviewReportSettings.energyIsSource,
        meters: facilityMeters,
        meterData: meterData,
        inOverview: false,
        co2Emissions: this.eGridService.co2Emissions,
        customFuels: customFuels
      });



    } else {
      // Web Workers are not supported in this environment.
      this.calanderizedMeters = getCalanderizedMeterData(facilityMeters, meterData, this.facility, false, { energyIsSource: this.overviewReportSettings.energyIsSource, neededUnits: undefined }, this.eGridService.co2Emissions, customFuels, [this.facility]);
      this.facilityOverviewData = new FacilityOverviewData(this.calanderizedMeters, this.dateRange, this.facility);
      this.utilityUseAndCost = new UtilityUseAndCost(this.calanderizedMeters, this.dateRange);
      this.calculating = false;
    }
  }
}
