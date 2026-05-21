import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, CostSavingsReportSettings } from 'src/app/models/idbModels/facilityReport';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { getMeterCollectionUnit, getYearsArray } from 'src/app/shared/sharedHelperFunctions';

@Component({
  selector: 'app-facility-cost-savings-report-setup',
  standalone: false,
  templateUrl: './facility-cost-savings-report-setup.component.html',
  styleUrl: './facility-cost-savings-report-setup.component.css',
})
export class FacilityCostSavingsReportSetupComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;

  selectedAnalysisItem: IdbAnalysisItem;

  reportYears: Array<number>;
  reportSettings: CostSavingsReportSettings;
  baselineYears: Array<number>;

  filteredAnalysisItems: Array<IdbAnalysisItem>;
  yearsList: Array<number>;

  hasDataChanged: boolean = false;
  costTableData: { [year: number]: { [groupId: string]: number } } = {};
  groupUnits: { [groupId: string]: string } = {};

  showModal: boolean = false;
  selectedGroup: AnalysisGroup;
  selectedYear: number;
  selectedYearError: boolean = false;
  calanderizedMetersSub: Subscription;

  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService) {
  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.reportSettings = this.facilityReport.costSavingsReportSettings;
      if (this.reportSettings && this.reportSettings.costSavingsTable) {
        this.costTableData = this.reportSettings.costSavingsTable;
      }
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items.filter(item => (item.analysisCategory == 'water') || (item.analysisCategory == 'energy' && !item.energyIsSource));
    });

    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeters.subscribe(() => {
      this.setYearOptions();
    });

    this.setSelectedAnalysisItem();
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
  }

  onSelectedAnalysisItemChange(item: IdbAnalysisItem) {
    this.selectedAnalysisItem = item;
    this.checkSelectedYearError();
    this.save();
  }

  onFilteredItemsChange(items: Array<IdbAnalysisItem>) {
    this.filteredAnalysisItems = items;
  }

  async setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.analysisItems.find(item => {
      return item.guid == this.facilityReport.analysisItemId;
    });
    this.checkSelectedYearError();
  }

  checkSelectedYearError() {
    if (this.selectedAnalysisItem) {
      if (this.selectedAnalysisItem.baselineYear <= this.reportSettings.reportYear) {
        this.selectedYearError = false;
        this.setTableYears();
        this.setGroupUnits();
      }
      else {
        this.selectedYearError = true;
      }
    }

  }

  async reportYearChanged() {
    if (this.selectedAnalysisItem) {
      if (this.selectedAnalysisItem.baselineYear <= this.reportSettings.reportYear) {
        this.selectedYearError = false;
        this.setTableYears();
      } else {
        this.selectedYearError = true;
      }
    }
    this.save();
  }

  async save() {
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(this.facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(this.facilityReport);
  }

  setYearOptions() {
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', false, this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

  setTableYears() {
    this.yearsList = getYearsArray(this.selectedAnalysisItem.baselineYear, this.reportSettings.reportYear);
    this.setCostValues();
  }

  setCostValues() {
    for (let year of this.yearsList) {
      if (!this.costTableData[year]) {
        this.costTableData[year] = {};
      }
      for (const group of this.selectedAnalysisItem.groups) {
        if (this.costTableData[year][group.idbGroupId] === undefined) {
          this.costTableData[year][group.idbGroupId] = null;
        }
      }
    }
  }

  setGroupUnits() {
    this.groupUnits = {};
    for (const group of this.selectedAnalysisItem.groups) {
      this.groupUnits[group.idbGroupId] = this.checkUnit(group);
    }
    this.reportSettings.groupUnits = { ...this.groupUnits };
  }

  checkUnit(group: AnalysisGroup): string {
    let unit: string;
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return group.idbGroupId == meter.groupId;
    });
    if (groupMeters.length > 1) {
      let mobileMeters = groupMeters.filter(meter => (meter.source == 'Other Fuels' && meter.scope == 2));

      if (mobileMeters.length == 0) {
        let isSameUnit = groupMeters.every(meter => meter.startingUnit == groupMeters[0].startingUnit);
        if (isSameUnit) {
          unit = groupMeters[0].startingUnit;
        }
        else {
          unit = this.selectedAnalysisItem?.energyUnit;
        }
      }
      else if (mobileMeters.length == groupMeters.length) {
        let isSameUnit = mobileMeters.every(meter => meter.vehicleCollectionUnit == mobileMeters[0].vehicleCollectionUnit);
        if (isSameUnit) {
          unit = mobileMeters[0].vehicleCollectionUnit;
        }
        else {
          unit = this.selectedAnalysisItem?.energyUnit;
        }
      }
      else if (mobileMeters.length > 0 && mobileMeters.length < groupMeters.length) {
        let nonMobileMeters = groupMeters.filter(meter => !(meter.source == 'Other Fuels' && meter.scope == 2));
        let isNonMobileSameUnit = nonMobileMeters.every(meter => meter.startingUnit == nonMobileMeters[0].startingUnit);
        let isMobileSameUnit = mobileMeters.every(meter => meter.vehicleCollectionUnit == mobileMeters[0].vehicleCollectionUnit);
        if (isNonMobileSameUnit && isMobileSameUnit && nonMobileMeters[0].startingUnit == mobileMeters[0].vehicleCollectionUnit) {
          unit = nonMobileMeters[0].startingUnit;
        }
        else {
          unit = this.selectedAnalysisItem?.energyUnit;
        }
      }
    }
    else if (groupMeters.length == 1) {
      unit = getMeterCollectionUnit(groupMeters[0]);
    }
    return unit;
  }

  hasMultipleMeters(group: AnalysisGroup): boolean {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return group.idbGroupId == meter.groupId;
    });
    return groupMeters.length > 1;
  }

  openCalculator(group: AnalysisGroup, year: number) {
    this.selectedGroup = group;
    this.selectedYear = year;
    this.showModal = true;
  }

  closeCalculator() {
    this.showModal = false;
  }

  updateBlendedRate(blendedRate: number) {
    if (this.selectedGroup && this.selectedYear) {
      this.costTableData[this.selectedYear][this.selectedGroup.idbGroupId] = blendedRate;
      this.updateReportSettings();
    }
    this.showModal = false;
  }

  updateReportSettings() {
    this.reportSettings.costSavingsTable = JSON.parse(JSON.stringify(this.costTableData));
    this.reportSettings.isDataComplete = this.isDataComplete();
    this.save();
  }

  isDataComplete(): boolean {
    for (let year of this.yearsList) {
      for (const group of this.selectedAnalysisItem.groups) {
        const cost = this.costTableData[year][group.idbGroupId];
        if (cost === null || cost === undefined || isNaN(cost)) {
          return false;
        }
      }
    }
    return true;
  }
}