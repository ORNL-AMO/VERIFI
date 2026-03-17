import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

@Component({
  selector: 'app-meter-grouping-results-graph',
  standalone: false,
  templateUrl: './meter-grouping-results-graph.component.html',
  styleUrls: ['./meter-grouping-results-graph.component.css'],
})
export class MeterGroupingResultsGraphComponent {
  meterGroup: IdbUtilityMeterGroup;


  calanderizedMeterData: Array<CalanderizedMeter>;
  groupMonthlyData: Array<MonthlyData>;
  energyUnit: string;

  showConsumption: boolean = false;
  showEnergyUse: boolean = true;
  metersInGroup: Array<IdbUtilityMeter>;
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterGroupId: string = params['id'];
      this.meterGroup = this.utilityMeterGroupDbService.getGroupById(meterGroupId);
      if (!this.meterGroup) {
        this.cancel();
      } else {
        this.setCalanderizedMeterData();
      }
    });
  }


  cancel() {
    this.router.navigate(['../..'], { relativeTo: this.activatedRoute });
  }

  viewGroupDataTable() {
    this.router.navigate(['../../data-table/' + this.meterGroup.guid], { relativeTo: this.activatedRoute });
  }

  editGroup() {
    this.router.navigate(['../../edit-group/' + this.meterGroup.guid], { relativeTo: this.activatedRoute });
  }

  setCalanderizedMeterData() {
    this.metersInGroup = this.utilityMeterDbService.getGroupMetersByGroupId(this.meterGroup.guid);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.energyUnit = facility.energyUnit;
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    //TODO: site/source option
    this.calanderizedMeterData = getCalanderizedMeterData(this.metersInGroup, facilityMeterData, facility, false, { energyIsSource: facility.energyIsSource, neededUnits: undefined }, [], [], [facility], account.assessmentReportVersion, []);
    this.groupMonthlyData = this.calanderizedMeterData.flatMap(meter => { return meter.monthlyData });
    //combine monthly data for meters in group with same month and year
    this.groupMonthlyData = this.groupMonthlyData.reduce((acc, monthlyData) => {
      let existingData = acc.find(data => { return data.month == monthlyData.month && data.year == monthlyData.year });
      if (existingData) {
        existingData.energyUse += monthlyData.energyUse;
        existingData.energyCost += monthlyData.energyCost;
        existingData.RECs += monthlyData.RECs;
        existingData.locationElectricityEmissions += monthlyData.locationElectricityEmissions;
        existingData.marketElectricityEmissions += monthlyData.marketElectricityEmissions;
        existingData.otherScope2Emissions += monthlyData.otherScope2Emissions;
        existingData.scope2LocationEmissions += monthlyData.scope2LocationEmissions;
        existingData.scope2MarketEmissions += monthlyData.scope2MarketEmissions;
        existingData.excessRECs += monthlyData.excessRECs;
        existingData.excessRECsEmissions += monthlyData.excessRECsEmissions;
        existingData.mobileCarbonEmissions += monthlyData.mobileCarbonEmissions;
        existingData.mobileBiogenicEmissions += monthlyData.mobileBiogenicEmissions;
        existingData.mobileOtherEmissions += monthlyData.mobileOtherEmissions;
        existingData.mobileTotalEmissions += monthlyData.mobileTotalEmissions;
        existingData.fugitiveEmissions += monthlyData.fugitiveEmissions;
        existingData.processEmissions += monthlyData.processEmissions;
        existingData.stationaryBiogenicEmmissions += monthlyData.stationaryBiogenicEmmissions;
        existingData.stationaryCarbonEmissions += monthlyData.stationaryCarbonEmissions;
        existingData.stationaryOtherEmissions += monthlyData.stationaryOtherEmissions;
        existingData.stationaryEmissions += monthlyData.stationaryEmissions;
        existingData.totalScope1Emissions += monthlyData.totalScope1Emissions;
        existingData.totalWithMarketEmissions += monthlyData.totalWithMarketEmissions;
        existingData.totalWithLocationEmissions += monthlyData.totalWithLocationEmissions;
        existingData.totalBiogenicEmissions += monthlyData.totalBiogenicEmissions;
      } else {
        acc.push({ ...monthlyData });
      }
      return acc;
    }, new Array<MonthlyData>());
  }

}
