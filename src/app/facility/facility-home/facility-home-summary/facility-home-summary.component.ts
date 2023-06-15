import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAnalysisItem, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { FacilityHomeService } from '../facility-home.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Router } from '@angular/router';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';
import { getNAICS } from 'src/app/shared/form-data/naics-data';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Component({
  selector: 'app-facility-home-summary',
  templateUrl: './facility-home-summary.component.html',
  styleUrls: ['./facility-home-summary.component.css']
})
export class FacilityHomeSummaryComponent implements OnInit {


  facility: IdbFacility
  lastBill: IdbUtilityMeterData;
  latestEnergyAnalysisItem: IdbAnalysisItem;
  latestWaterAnalysisItem: IdbAnalysisItem;
  sources: Array<MeterSource>;
  naics: string;
  selectedFacilitySub: Subscription;
  calculatingEnergy: boolean | 'error';
  calculatingEnergySub: Subscription;
  calculatingWater: boolean | 'error';
  calculatingWaterSub: Subscription;
  monthlyFacilityEnergyAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyFacilityEnergyAnalysisDataSub: Subscription;
  monthlyFacilityWaterAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyFacilityWaterAnalysisDataSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService, private facilityHomeService: FacilityHomeService,
    private router: Router,
    private utilityMeterDbService: UtilityMeterdbService,
    private exportToExcelTemplateService: ExportToExcelTemplateService) { }

  ngOnInit(): void {

    this.calculatingEnergySub = this.facilityHomeService.calculatingEnergy.subscribe(val => {
      this.calculatingEnergy = val;
    });
    this.calculatingWaterSub = this.facilityHomeService.calculatingWater.subscribe(val => {
      this.calculatingWater = val;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = this.facilityDbService.selectedFacility.getValue();
      this.setNAICS();
      this.setFacilityStatus();
    });
    this.monthlyFacilityEnergyAnalysisDataSub = this.facilityHomeService.monthlyFacilityEnergyAnalysisData.subscribe(val => {
      this.monthlyFacilityEnergyAnalysisData = val;
    });
    this.monthlyFacilityWaterAnalysisDataSub = this.facilityHomeService.monthlyFacilityWaterAnalysisData.subscribe(val => {
      this.monthlyFacilityWaterAnalysisData = val;
    });

  }

  ngOnDestroy() {
    this.monthlyFacilityEnergyAnalysisDataSub.unsubscribe();
    this.monthlyFacilityWaterAnalysisDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.calculatingEnergySub.unsubscribe();
    this.calculatingWaterSub.unsubscribe();
  }

  navigateTo(urlStr: string) {
    if (urlStr != 'upload') {
      this.router.navigateByUrl('facility/' + this.facility.id + '/' + urlStr);
    } else {
      this.router.navigateByUrl('/' + urlStr);
    }
  }

  setFacilityStatus() {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.lastBill = _.maxBy(facilityMeterData, (data: IdbUtilityMeterData) => { return new Date(data.readDate) });
    this.latestEnergyAnalysisItem = this.facilityHomeService.latestEnergyAnalysisItem;
    this.latestWaterAnalysisItem = this.facilityHomeService.latestWaterAnalysisItem;
    this.setSources();
  }


  setSources() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.guid });
    let sources: Array<MeterSource> = facilityMeters.map(meter => { return meter.source });
    this.sources = _.uniq(sources);
  }

  getColor(source: MeterSource): string {
    return UtilityColors[source].color
  }

  setNAICS() {
    this.naics = getNAICS(this.facility);
  }

  exportData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.exportToExcelTemplateService.exportFacilityData(selectedFacility.guid);
  }


}
