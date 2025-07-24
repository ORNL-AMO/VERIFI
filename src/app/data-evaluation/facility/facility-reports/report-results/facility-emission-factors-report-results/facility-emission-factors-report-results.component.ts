import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, EmissionFactorsReportSettings } from 'src/app/models/idbModels/facilityReport';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { FacilityReportsService } from '../../facility-reports.service';
import { EmissionsRate, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { getEmissionsRate } from 'src/app/calculations/emissions-calculations/emissions';

@Component({
  selector: 'app-facility-emission-factors-report-results',
  standalone: false,

  templateUrl: './facility-emission-factors-report-results.component.html',
  styleUrl: './facility-emission-factors-report-results.component.css'
})
export class FacilityEmissionFactorsReportResultsComponent {

  facilityReport: IdbFacilityReport;
  emissionFactorsReportSettings: EmissionFactorsReportSettings;
  facilityReportSub: Subscription;
  print: boolean;
  printSub: Subscription;

  facility: IdbFacility;
  emissionData: Array<{ year: number, marketRate: EmissionsRate, locationRate: EmissionsRate, directEmissionsRate: boolean }> = [];
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private facilityReportsService: FacilityReportsService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService) {
  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.emissionFactorsReportSettings = this.facilityReport.emissionFactorsReportSettings;
      this.calculateFacilitiesSummary();
    });
    this.printSub = this.facilityReportsService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.printSub.unsubscribe();
  }

  calculateFacilitiesSummary() {
    this.facility = this.facilityDbService.getFacilityById(this.facilityReport.facilityId);
    let co2EmissionsRates: Array<SubregionEmissions> = this.eGridService.co2Emissions.map(rate => { return rate });

    for (let year = this.emissionFactorsReportSettings.startYear; year <= this.emissionFactorsReportSettings.endYear; year++) {
      let emissionsRate = getEmissionsRate(this.facility.eGridSubregion, year, co2EmissionsRates);
      if (emissionsRate) {
        this.emissionData.push({
          year: year,
          marketRate: emissionsRate.marketRate,
          locationRate: emissionsRate.locationRate,
          directEmissionsRate: emissionsRate.directEmissionsRate
        });
      }
    }
    console.log('Emission Data:', this.emissionData);
  }
}
